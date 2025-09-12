#region license
// Copyright 2025 Utah Departement of Transportation
// for ReportApi - Utah.Udot.Atspm.ReportApi.Controllers/WaitTimeController.cs
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
#endregion

using Asp.Versioning;
using AutoFixture;
using Microsoft.AspNetCore.Mvc;
using Utah.Udot.Atspm.Data.Models.AggregationModels;

namespace Utah.Udot.Atspm.ReportApi.Controllers
{
    /// <summary>
    /// Wait time report controller
    /// </summary>
    [ApiVersion(1.0)]
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class PedestrianAggregationController : ControllerBase
    {
        /// <summary>
        /// Get example data for testing
        /// </summary>
        /// <returns></returns>
        [HttpGet("test")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public virtual ActionResult<object> GetTestData()
        {
            return Ok(new Fixture().Create<object>());
        }

        /// <summary>
        /// Get traffic location data based on query
        /// </summary>
        /// <param name="query">Query parameters for location data</param>
        /// <returns>List of PedatLocationData objects</returns>
        [HttpPost("get-data")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<PedatLocationData>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult<IEnumerable<PedatLocationData>> GetLocationData([FromBody] PedatLocationDataQuery query)
        {
            if (query == null || query.LocationIdentifiers == null || query.LocationIdentifiers.Count == 0)
                return BadRequest("Invalid query parameters.");

            // TODO: Replace this with real service/repository call
            var exampleData = new List<PedatLocationData>
            {
                new PedatLocationData
                {
                    LocationIdentifier = "123",
                    TotalVolume = 6500,
                    AverageDailyVolume = 55,
                    AverageVolumeByHourOfDay = new List<IndexedVolume>
                    {
                        new IndexedVolume { Index = 0, Volume = 1 },
                        new IndexedVolume { Index = 1, Volume = 5 },
                        // ... continue up to Index 23 if needed
                    },
                    AverageVolumeByDayOfWeek = new List<IndexedVolume>
                    {
                        new IndexedVolume { Index = 1, Volume = 65 }, // Monday
                        new IndexedVolume { Index = 2, Volume = 72 },
                    },
                    AverageVolumeByMonthOfYear = new List<IndexedVolume>
                    {
                        new IndexedVolume { Index = 1, Volume = 300 }, // January
                        new IndexedVolume { Index = 2, Volume = 250 }, // February
                    },
                    RawData = new List<RawDataPoint>
                    {
                        new RawDataPoint { },
                        new RawDataPoint { }
                    }
                }
            };

            return Ok(exampleData);
        }

    }
}