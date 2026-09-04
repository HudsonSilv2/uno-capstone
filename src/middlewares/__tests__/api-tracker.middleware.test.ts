import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { apiTrackerMiddleware, withApiTracking } from '../api-tracker.middleware';
import apiTrackerService from '../../services/api-tracker.service';
import { AuthRequest } from '../auth.middleware';

jest.mock('../../services/api-tracker.service', () => ({
  __esModule: true,
  default: {
    createLog: jest.fn(),
  },
}));

const mockedService = apiTrackerService as unknown as {
  createLog: jest.Mock;
};

class MockResponse extends EventEmitter {
  public statusCode = 200;
}

describe('apiTrackerMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next() and logs request data when response finishes (unauthenticated)', () => {
    const req = {
      originalUrl: '/api/players',
      method: 'GET',
    } as unknown as Request;

    const res = new MockResponse() as unknown as Response;
    res.statusCode = 200;

    const next: NextFunction = jest.fn();

    apiTrackerMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockedService.createLog).not.toHaveBeenCalled();

    // Trigger finish event on response
    (res as unknown as EventEmitter).emit('finish');

    expect(mockedService.createLog).toHaveBeenCalledTimes(1);
    expect(mockedService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointAccess: '/api/players',
        requestMethod: 'GET',
        statusCode: 200,
        userId: null,
      })
    );
    expect(typeof mockedService.createLog.mock.calls[0][0].responseTime).toBe('number');
    expect(mockedService.createLog.mock.calls[0][0].timestamp).toBeInstanceOf(Date);
  });

  it('captures userId when user is authenticated in request', () => {
    const req = {
      originalUrl: '/api/games',
      method: 'POST',
      user: {
        id: 42,
        email: 'player@example.com',
      },
    } as unknown as AuthRequest;

    const res = new MockResponse() as unknown as Response;
    res.statusCode = 201;

    const next: NextFunction = jest.fn();

    apiTrackerMiddleware(req, res, next);
    (res as unknown as EventEmitter).emit('finish');

    expect(mockedService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointAccess: '/api/games',
        requestMethod: 'POST',
        statusCode: 201,
        userId: '42',
      })
    );
  });

  it('falls back to req.baseUrl + req.path or req.url when originalUrl is not present', () => {
    const req = {
      url: '/health',
      method: 'GET',
    } as unknown as Request;

    const res = new MockResponse() as unknown as Response;
    res.statusCode = 200;

    const next: NextFunction = jest.fn();

    apiTrackerMiddleware(req, res, next);
    (res as unknown as EventEmitter).emit('finish');

    expect(mockedService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointAccess: '/health',
        requestMethod: 'GET',
      })
    );
  });
});

describe('withApiTracking (Higher-Order Function)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps and executes the handler while tracking response on finish', () => {
    const mockHandler = jest.fn((_req, res: Response) => {
      res.statusCode = 200;
      (res as unknown as EventEmitter).emit('finish');
    });

    const wrappedHandler = withApiTracking(mockHandler);

    const req = {
      originalUrl: '/api/scores',
      method: 'GET',
    } as unknown as Request;

    const res = new MockResponse() as unknown as Response;
    const next: NextFunction = jest.fn();

    wrappedHandler(req, res, next);

    expect(mockHandler).toHaveBeenCalledWith(req, res, next);
    expect(mockedService.createLog).toHaveBeenCalledTimes(1);
    expect(mockedService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointAccess: '/api/scores',
        requestMethod: 'GET',
        statusCode: 200,
        userId: null,
      })
    );
  });
});
