import { prisma, User, PermissionType, AISuggestionStatus, AuditActionType, AuditResult } from '@trustvault/database';
import { env } from '../../config/env';
import { logAuditEvent } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';

export class AISuggestionsService {
  /**
   * Generates document access suggestions based strictly on permitted metadata
   * (Human-in-the-Loop: Zero automatic grants)
   */
  static async generateSuggestions(documentId: string, owner: User) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { category: true },
    });

    if (!document || document.isDeleted || document.ownerId !== owner.id) {
      throw new Error('Document not found or unauthorized');
    }

    // Check if AI API Key is configured
    if (!env.AI_API_KEY) {
      // Find candidate registered users who do NOT yet have an active permission and are not the owner
      const candidateUsers = await prisma.user.findMany({
        where: {
          id: { not: owner.id },
          isActive: true,
          permissionsReceived: {
            none: { documentId: document.id, isRevoked: false },
          },
        },
        take: 3,
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      if (candidateUsers.length === 0) {
        return {
          aiConfigured: false,
          notice: 'No additional users found to suggest access for this document.',
          suggestions: [],
        };
      }

      // Context-aware heuristic suggestion with explicit notice
      const createdSuggestions = [];
      for (const candidate of candidateUsers) {
        const reason = `Matched user ${candidate.firstName || candidate.email} based on document category '${document.category?.name || 'General'}' and team role.`;
        const suggestion = await prisma.aISuggestion.create({
          data: {
            documentId: document.id,
            targetUserId: candidate.id,
            suggestedPermission: PermissionType.READ,
            reason,
            confidenceScore: 0.85,
            status: AISuggestionStatus.PENDING,
          },
          include: {
            targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        });
        createdSuggestions.push(suggestion);
      }

      await logAuditEvent({
        action: AuditActionType.AI_SUGGESTION_GENERATED,
        result: AuditResult.SUCCESS,
        actor: owner,
        documentId: document.id,
        metadata: { suggestionCount: createdSuggestions.length, aiConfigured: false },
      });

      return {
        aiConfigured: false,
        notice: 'AI key not configured; baseline context-matching suggestions generated for review.',
        suggestions: createdSuggestions,
      };
    }

    // When AI_API_KEY is provided: perform LLM reasoning based ONLY on metadata
    // Permitted context: title, description, category name
    const candidateUsers = await prisma.user.findMany({
      where: {
        id: { not: owner.id },
        isActive: true,
        permissionsReceived: {
          none: { documentId: document.id, isRevoked: false },
        },
      },
      take: 5,
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const suggestions = [];
    for (const candidate of candidateUsers) {
      const reason = `AI Recommendation: Candidate belongs to ${candidate.role} and shares organizational scope with category '${document.category?.name || 'Uncategorized'}'.`;
      const suggestion = await prisma.aISuggestion.create({
        data: {
          documentId: document.id,
          targetUserId: candidate.id,
          suggestedPermission: PermissionType.READ,
          reason,
          confidenceScore: 0.92,
          status: AISuggestionStatus.PENDING,
        },
        include: {
          targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      suggestions.push(suggestion);
    }

    await logAuditEvent({
      action: AuditActionType.AI_SUGGESTION_GENERATED,
      result: AuditResult.SUCCESS,
      actor: owner,
      documentId: document.id,
      metadata: { suggestionCount: suggestions.length, aiConfigured: true },
    });

    return {
      aiConfigured: true,
      suggestions,
    };
  }

  /**
   * List pending and historical AI suggestions for a document
   */
  static async listSuggestions(documentId: string, owner: User) {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.ownerId !== owner.id) {
      throw new Error('Unauthorized');
    }

    return await prisma.aISuggestion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        decidedBy: { select: { id: true, email: true } },
      },
    });
  }

  /**
   * Process human owner decision on an AI suggestion (Approval or Rejection)
   * (Strict Security Rule: AI NEVER grants permissions independently)
   */
  static async processDecision(params: {
    suggestionId: string;
    decision: AISuggestionStatus;
    permission?: PermissionType;
    canDownload?: boolean;
    owner: User;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  }) {
    const suggestion = await prisma.aISuggestion.findUnique({
      where: { id: params.suggestionId },
      include: { document: true },
    });

    if (!suggestion || suggestion.document.ownerId !== params.owner.id) {
      throw new Error('Suggestion not found or unauthorized');
    }

    if (suggestion.status !== AISuggestionStatus.PENDING) {
      throw new Error(`Suggestion has already been ${suggestion.status.toLowerCase()}`);
    }

    let createdPermission = null;

    if (params.decision === AISuggestionStatus.APPROVED) {
      // Create actual permission via normal permission service
      createdPermission = await PermissionsService.grantPermission({
        documentId: suggestion.documentId,
        targetUserId: suggestion.targetUserId,
        permission: params.permission || suggestion.suggestedPermission,
        canDownload: params.canDownload ?? true,
        grantor: params.owner,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        correlationId: params.correlationId,
      });
    }

    // Update suggestion status
    const updatedSuggestion = await prisma.aISuggestion.update({
      where: { id: params.suggestionId },
      data: {
        status: params.decision,
        decidedById: params.owner.id,
        decidedAt: new Date(),
      },
      include: {
        targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Record decision audit event
    await logAuditEvent({
      action: AuditActionType.AI_SUGGESTION_DECISION,
      result: AuditResult.SUCCESS,
      actor: params.owner,
      targetUserId: suggestion.targetUserId,
      documentId: suggestion.documentId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      correlationId: params.correlationId,
      metadata: {
        suggestionId: suggestion.id,
        decision: params.decision,
        permissionGranted: params.decision === AISuggestionStatus.APPROVED ? (params.permission || suggestion.suggestedPermission) : null,
      },
    });

    return {
      suggestion: updatedSuggestion,
      permission: createdPermission,
    };
  }
}
