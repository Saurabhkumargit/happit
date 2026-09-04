declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };

      auth?: {
        sessionId: string;
      };
    }
  }
}

export {};