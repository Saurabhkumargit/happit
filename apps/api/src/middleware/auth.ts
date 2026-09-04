import type { RequestHandler } from "express";

import { getSession } from "../lib/session.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const sessionId = req.cookies.session;

    if (!sessionId) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      });

      return;
    }

    const session = await getSession(sessionId);

    if (!session) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      });

      return;
    }

    req.user = {
      id: session.userId,
    };

    next();
  } catch (error) {
    next(error);
  }
};