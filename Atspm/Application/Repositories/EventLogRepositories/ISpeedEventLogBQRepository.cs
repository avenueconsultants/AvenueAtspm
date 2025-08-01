using Utah.Udot.Atspm.Data.Models.EventLogModels;

namespace Utah.Udot.Atspm.Repositories.EventLogRepositories
{
    public interface ISpeedEventLogBQRepository : IBigQueryRepository<SpeedEvent>
    {
        IReadOnlyList<SpeedEvent> GetByLocationAndTimeRange(string locationIdentifier, DateTime start, DateTime end);
    }
}
