import { Request, Response, NextFunction } from 'express';
import { AISuggestionsService } from './aiSuggestions.service';
import { AISuggestionDecisionSchema } from '@trustvault/shared';

export class AISuggestionsController {
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AISuggestionsService.generateSuggestions(req.params.id, req.user!);
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const suggestions = await AISuggestionsService.listSuggestions(req.params.id, req.user!);
      return res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      next(error);
    }
  }

  static async processDecision(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = AISuggestionDecisionSchema.parse(req.body);
      const result = await AISuggestionsService.processDecision({
        suggestionId: req.params.id,
        decision: validated.decision as any,
        permission: validated.permission as any,
        canDownload: validated.canDownload,
        owner: req.user!,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: (req.headers['x-correlation-id'] as string) || req.id,
      });

      return res.json({
        success: true,
        data: result,
        message: `AI suggestion ${validated.decision.toLowerCase()} successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
