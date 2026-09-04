declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };

      auth?: {
        userId: string;
        sessionId: string;
      };
    }
  }
}

export {};