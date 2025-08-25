using Utah.Udot.Atspm.Business.SpeedManagement.Reports;
using Utah.Udot.Atspm.Data.Models.SpeedManagementModels;
using Utah.Udot.Atspm.Data.Models.SpeedManagementModels.Common;
using Utah.Udot.Atspm.Data.Models.SpeedManagementModels.Config;
using Utah.Udot.Atspm.Data.Models.SpeedManagementModels.SegmentSpeed;
using Utah.Udot.NetStandardToolkit.Services;

namespace Utah.Udot.Atspm.Repositories.SpeedManagementRepositories
{
    public interface IHourlySpeedRepository : IAsyncRepository<HourlySpeed>
    {
        public Task AddHourlySpeedAsync(HourlySpeed hourlySpeed);
        public Task AddHourlySpeedsAsync(List<HourlySpeed> hourlySpeeds);
        public Task<List<DailyAverage>> GetDailyAveragesAsync(Guid segmentId, DateOnly startDate, DateOnly endDate);
        public Task<List<HourlySpeed>> GetHourlySpeedsForSegmentInSource(OptionsBase baseOptions, Guid segmentId);
        public Task<List<HourlySpeed>> GetWeeklySpeedsForSegmentInSource(OptionsBase baseOptions, Guid segmentId);
        Task<List<HourlySpeed>> GetHourlySpeedsForTimePeriod(Guid segmentId, DateTime startDate, DateTime endDate, DateTime startTime, DateTime endTime, long? sourceId);
        Task<List<HourlySpeed>> HourlyAggregationsForSegmentInTimePeriod(List<Guid> segmentIds, DateTime startTime, DateTime endTime, long? sourceId);
        Task<List<HourlySpeed>> GetHourlySpeedsWithFiltering(List<Guid> segmentIds, long? sourceId, DateTime startDate, DateTime endDate, DateTime? startTime, DateTime? endTime, List<int>? daysOfWeek, List<DateTime> specificDays);
        Task DeleteBySegment(Guid segmentId);
        Task DeleteBySegmentWithSource(Guid segmentId, long sourceId);
        Task DeleteBySegments(List<Guid> segments);
        Task<List<HourlySpeed>> GetSpeedsForReport(ExportableReportOptions options, List<Segment> segment);
        #region ExtensionMethods



        #endregion

        #region Obsolete


        #endregion
    }
}