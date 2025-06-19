using System;
using System.Collections.Generic;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.NetStandardToolkit.Services;

namespace Utah.Udot.Atspm.Repositories.EventLogRepositories
{
    public interface IIndianaEventLogBQRepository : IBigQueryRepository<IndianaEvent>
    {
    }
}
