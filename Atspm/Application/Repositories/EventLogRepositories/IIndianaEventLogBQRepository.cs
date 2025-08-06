using Utah.Udot.Atspm.Data.Models.EventLogModels;

namespace Utah.Udot.Atspm.Repositories.EventLogRepositories
{
    public interface IIndianaEventLogBQRepository : IBigQueryRepository<IndianaEvent>
    {
        IReadOnlyList<IndianaEvent> GetByLocationAndTimeRange(string locationIdentifier, DateTime start, DateTime end);
        IReadOnlyList<IndianaEvent> GetByLocationsAndTimeRange(List<string> locationIds, DateTime start, DateTime end);
    }
}
