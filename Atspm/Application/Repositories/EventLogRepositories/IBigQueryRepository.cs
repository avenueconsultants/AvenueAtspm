#region license
// Copyright 2025 Utah Department of Transportation
// for Application - Utah.Udot.Atspm.Repositories.EventLogRepositories/IIndianaEventLogRepositoryBQ.cs
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
#endregion

using System;
using System.Collections.Generic;
using Utah.Udot.NetStandardToolkit.Services;
using Utah.Udot.Atspm.Data.Models.EventLogModels;

namespace Utah.Udot.Atspm.Repositories.EventLogRepositories
{
    /// <summary>
    /// BigQuery repository for uncompressed Indiana events
    /// </summary>
    public interface IBigQueryRepository<T>
    {
        /// <summary>
        /// Inserts a single item
        /// </summary>
        Task AddAsync(T item);

        /// <summary>
        /// Inserts a collection of items
        /// </summary>
        Task AddRangeAsync(IEnumerable<T> items);

        /// <summary>
        /// Queries items by location identifier and time range
        /// </summary>
        IReadOnlyList<T> GetByLocationAndTimeRange(string locationIdentifier, DateTime start, DateTime end);
    }
}
