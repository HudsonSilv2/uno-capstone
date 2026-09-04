import { Request, Response } from 'express';
import { StatsController } from '../stats.controller';
import apiTrackerService from '../../services/api-tracker.service';

jest.mock('../../services/api-tracker.service');

const mockedApiTrackerService = apiTrackerService as jest.Mocked<typeof apiTrackerService>;

describe('StatsController', () => {
  let controller: StatsController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    controller = new StatsController();
    req = {};
    res = {
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getRequests', () => {
    it('returns request statistics successfully', async () => {
      const mockResult = {
        total_requests: 10,
        breakdown: { '/api/users': { GET: 10 } },
      };
      mockedApiTrackerService.getRequestStats.mockResolvedValue(mockResult);

      await controller.getRequests(req as Request, res as Response, next);

      expect(mockedApiTrackerService.getRequestStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes error to next middleware on failure', async () => {
      const error = new Error('Database error');
      mockedApiTrackerService.getRequestStats.mockRejectedValue(error);

      await controller.getRequests(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getResponseTimes', () => {
    it('returns response time statistics successfully', async () => {
      const mockResult = {
        '/api/users': { avg: 100, min: 50, max: 200 },
      };
      mockedApiTrackerService.getResponseTimeStats.mockResolvedValue(mockResult);

      await controller.getResponseTimes(req as Request, res as Response, next);

      expect(mockedApiTrackerService.getResponseTimeStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes error to next middleware on failure', async () => {
      const error = new Error('Database error');
      mockedApiTrackerService.getResponseTimeStats.mockRejectedValue(error);

      await controller.getResponseTimes(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getStatusCodes', () => {
    it('returns status code statistics successfully', async () => {
      const mockResult = { '200': 15, '404': 2 };
      mockedApiTrackerService.getStatusCodeStats.mockResolvedValue(mockResult);

      await controller.getStatusCodes(req as Request, res as Response, next);

      expect(mockedApiTrackerService.getStatusCodeStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes error to next middleware on failure', async () => {
      const error = new Error('Database error');
      mockedApiTrackerService.getStatusCodeStats.mockRejectedValue(error);

      await controller.getStatusCodes(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPopularEndpoints', () => {
    it('returns popular endpoint statistics successfully', async () => {
      const mockResult = { most_popular: '/api/users', request_count: 50 };
      mockedApiTrackerService.getPopularEndpointStats.mockResolvedValue(mockResult);

      await controller.getPopularEndpoints(req as Request, res as Response, next);

      expect(mockedApiTrackerService.getPopularEndpointStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes error to next middleware on failure', async () => {
      const error = new Error('Database error');
      mockedApiTrackerService.getPopularEndpointStats.mockRejectedValue(error);

      await controller.getPopularEndpoints(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
