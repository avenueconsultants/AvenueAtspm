﻿#region license
// Copyright 2024 Utah Departement of Transportation
// for ApplicationCore - ATSPM.Application.Analysis.WorkflowSteps/AggregatePreemptCodes.cs
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

using System.Threading.Tasks.Dataflow;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Specifications;
using Utah.Udot.NetStandardToolkit.Extensions;

namespace Utah.Udot.Atspm.Analysis.WorkflowSteps
{
    public class AggregatePreemptCodes : TransformProcessStepBase<Tuple<Location, int, IEnumerable<IndianaEvent>>, IEnumerable<PreemptionAggregation>>
    {
        public AggregatePreemptCodes(ExecutionDataflowBlockOptions dataflowBlockOptions = default) : base(dataflowBlockOptions) { }

        protected override Task<IEnumerable<PreemptionAggregation>> Process(Tuple<Location, int, IEnumerable<IndianaEvent>> input, CancellationToken cancelToken = default)
        {
            var Location = input.Item1;
            var preempt = input.Item2;
            var logs = input.Item3.FromSpecification(new IndianaLogLocationAndParamterFilterSpecification(Location, preempt));

            var tl = new Timeline<PreemptionAggregation>(logs, TimeSpan.FromMinutes(15));

            tl.Segments.ToList().ForEach(f =>
            {
                f.LocationIdentifier = Location.LocationIdentifier;
                f.PreemptNumber = preempt;
                f.PreemptServices = logs.Count(c => c.EventCode == 102 && f.InRange(c));
                f.PreemptServices = logs.Count(c => c.EventCode == 105 && f.InRange(c));
            });

            var result = tl.Segments.AsEnumerable();

            return Task.FromResult(result);
        }
    }
}