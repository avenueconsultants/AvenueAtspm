using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.NetStandardToolkit.Services;

namespace Utah.Udot.Atspm.Repositories.EventLogRepositories
{
    public interface ISpeedEventLogBQRepository : IBigQueryRepository<SpeedEvent>
    {
    }
}
