import ApiTracker, { ApiTrackerAttributes } from '../models/api-tracker.model';

export interface RequestStats {
  total_requests: number;
  breakdown: Record<string, Record<string, number>>;
}

export interface ResponseTimeStats {
  [endpoint: string]: {
    avg: number;
    min: number;
    max: number;
  };
}

export interface StatusCodeStats {
  [statusCode: string]: number;
}

export interface PopularEndpointStats {
  most_popular: string | null;
  request_count: number;
}

export class ApiTrackerService {
  public async createLog(data: ApiTrackerAttributes): Promise<ApiTracker | null> {
    try {
      return await ApiTracker.create(data);
    } catch (error) {
      console.error('Failed to save API tracking log:', error);
      return null;
    }
  }

  public async getAllLogs(): Promise<ApiTracker[]> {
    return await ApiTracker.findAll({
      order: [['timestamp', 'DESC']],
    });
  }

  public async getRequestStats(): Promise<RequestStats> {
    const logs = await this.getAllLogs();
    const total_requests = logs.length;

    const breakdown = logs.reduce((acc, log) => {
      const endpoint = log.endpointAccess;
      const method = log.requestMethod;

      if (!acc[endpoint]) {
        acc[endpoint] = {};
      }
      acc[endpoint][method] = (acc[endpoint][method] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return {
      total_requests,
      breakdown,
    };
  }

  public async getResponseTimeStats(): Promise<ResponseTimeStats> {
    const logs = await this.getAllLogs();

    const timesByEndpoint = logs.reduce((acc, log) => {
      const endpoint = log.endpointAccess;
      if (!acc[endpoint]) {
        acc[endpoint] = [];
      }
      acc[endpoint].push(log.responseTime);
      return acc;
    }, {} as Record<string, number[]>);

    const stats: ResponseTimeStats = {};
    Object.keys(timesByEndpoint).forEach((endpoint) => {
      const times = timesByEndpoint[endpoint];
      const sum = times.reduce((total, current) => total + current, 0);
      const avg = Math.round(sum / times.length);
      const min = Math.min(...times);
      const max = Math.max(...times);

      stats[endpoint] = { avg, min, max };
    });

    return stats;
  }

  public async getStatusCodeStats(): Promise<StatusCodeStats> {
    const logs = await this.getAllLogs();

    const statusCounts = logs.reduce((acc, log) => {
      const code = String(log.statusCode);
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as StatusCodeStats);

    return statusCounts;
  }

  public async getPopularEndpointStats(): Promise<PopularEndpointStats> {
    const logs = await this.getAllLogs();

    if (logs.length === 0) {
      return {
        most_popular: null,
        request_count: 0,
      };
    }

    const countsByEndpoint = logs.reduce((acc, log) => {
      const endpoint = log.endpointAccess;
      acc[endpoint] = (acc[endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popular = Object.entries(countsByEndpoint).reduce(
      (max, [endpoint, count]) => {
        return count > max.request_count ? { most_popular: endpoint, request_count: count } : max;
      },
      { most_popular: null as string | null, request_count: 0 }
    );

    return popular;
  }
}

export const apiTrackerService = new ApiTrackerService();
export default apiTrackerService;

