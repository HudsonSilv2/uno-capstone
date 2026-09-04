import { ApiTrackerService } from '../api-tracker.service';
import ApiTracker from '../../models/api-tracker.model';

jest.mock('../../models/api-tracker.model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
}));

const mockedApiTracker = ApiTracker as unknown as {
  create: jest.Mock;
  findAll: jest.Mock;
};

describe('ApiTrackerService', () => {
  const service = new ApiTrackerService();

  describe('createLog', () => {
    it('creates and returns the tracking record on success', async () => {
      const data = {
        responseTime: 100,
        endpointAccess: '/api/players',
        requestMethod: 'GET',
        statusCode: 200,
        timestamp: new Date('2026-08-29T12:00:00Z'),
        userId: '1',
      };

      mockedApiTracker.create.mockResolvedValue({ id: 1, ...data });

      const result = await service.createLog(data);

      expect(mockedApiTracker.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ id: 1, ...data });
    });

    it('returns null and logs error if database creation fails without throwing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const data = {
        responseTime: 50,
        endpointAccess: '/api/games',
        requestMethod: 'POST',
        statusCode: 201,
        timestamp: new Date('2026-08-29T12:00:00Z'),
      };

      mockedApiTracker.create.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.createLog(data);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllLogs', () => {
    it('returns all logs ordered by timestamp descending', async () => {
      const mockLogs = [
        { id: 2, endpointAccess: '/api/games', timestamp: new Date() },
        { id: 1, endpointAccess: '/api/players', timestamp: new Date() },
      ];
      mockedApiTracker.findAll.mockResolvedValue(mockLogs);

      const result = await service.getAllLogs();

      expect(mockedApiTracker.findAll).toHaveBeenCalledWith({
        order: [['timestamp', 'DESC']],
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getRequestStats', () => {
    it('returns total requests and breakdown by endpoint and method', async () => {
      const mockLogs = [
        { endpointAccess: '/api/users', requestMethod: 'GET' },
        { endpointAccess: '/api/users', requestMethod: 'GET' },
        { endpointAccess: '/api/users', requestMethod: 'POST' },
        { endpointAccess: '/api/products', requestMethod: 'GET' },
        { endpointAccess: '/api/products', requestMethod: 'DELETE' },
      ];
      mockedApiTracker.findAll.mockResolvedValue(mockLogs);

      const stats = await service.getRequestStats();

      expect(stats).toEqual({
        total_requests: 5,
        breakdown: {
          '/api/users': {
            GET: 2,
            POST: 1,
          },
          '/api/products': {
            GET: 1,
            DELETE: 1,
          },
        },
      });
    });

    it('handles empty logs gracefully', async () => {
      mockedApiTracker.findAll.mockResolvedValue([]);
      const stats = await service.getRequestStats();
      expect(stats).toEqual({
        total_requests: 0,
        breakdown: {},
      });
    });
  });

  describe('getResponseTimeStats', () => {
    it('calculates average, min, and max response times per endpoint', async () => {
      const mockLogs = [
        { endpointAccess: '/api/users', responseTime: 50 },
        { endpointAccess: '/api/users', responseTime: 150 },
        { endpointAccess: '/api/users', responseTime: 300 },
        { endpointAccess: '/api/products', responseTime: 100 },
        { endpointAccess: '/api/products', responseTime: 500 },
      ];
      mockedApiTracker.findAll.mockResolvedValue(mockLogs);

      const stats = await service.getResponseTimeStats();

      expect(stats).toEqual({
        '/api/users': {
          avg: 167,
          min: 50,
          max: 300,
        },
        '/api/products': {
          avg: 300,
          min: 100,
          max: 500,
        },
      });
    });

    it('returns empty object when no logs exist', async () => {
      mockedApiTracker.findAll.mockResolvedValue([]);
      const stats = await service.getResponseTimeStats();
      expect(stats).toEqual({});
    });
  });

  describe('getStatusCodeStats', () => {
    it('aggregates counts for each HTTP status code', async () => {
      const mockLogs = [
        { statusCode: 200 },
        { statusCode: 200 },
        { statusCode: 201 },
        { statusCode: 404 },
        { statusCode: 500 },
      ];
      mockedApiTracker.findAll.mockResolvedValue(mockLogs);

      const stats = await service.getStatusCodeStats();

      expect(stats).toEqual({
        '200': 2,
        '201': 1,
        '404': 1,
        '500': 1,
      });
    });

    it('returns empty object when no logs exist', async () => {
      mockedApiTracker.findAll.mockResolvedValue([]);
      const stats = await service.getStatusCodeStats();
      expect(stats).toEqual({});
    });
  });

  describe('getPopularEndpointStats', () => {
    it('identifies the most popular endpoint and its request count', async () => {
      const mockLogs = [
        { endpointAccess: '/api/users' },
        { endpointAccess: '/api/users' },
        { endpointAccess: '/api/users' },
        { endpointAccess: '/api/products' },
      ];
      mockedApiTracker.findAll.mockResolvedValue(mockLogs);

      const stats = await service.getPopularEndpointStats();

      expect(stats).toEqual({
        most_popular: '/api/users',
        request_count: 3,
      });
    });

    it('returns null and 0 count when no logs exist', async () => {
      mockedApiTracker.findAll.mockResolvedValue([]);
      const stats = await service.getPopularEndpointStats();
      expect(stats).toEqual({
        most_popular: null,
        request_count: 0,
      });
    });
  });
});

