﻿#region license
// Copyright 2024 Utah Departement of Transportation
// for Data - Utah.Udot.Atspm.Data.Models/Detector.cs
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

// <auto-generated> This file has been auto generated by EF Core Power Tools. </auto-generated>
#nullable disable
using Utah.Udot.Atspm.Data.Enums;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Data.Relationships;

namespace Utah.Udot.Atspm.Data.Models
{
    /// <summary>
    /// Detector
    /// </summary>
    public partial class Detector : 
        AtspmConfigModelBase<int>, 
        IRelatedApproach, 
        IRelatedDetectorComments,
        IRelatedDetectionTypes
    {
        /// <summary>
        /// Detector identifier
        /// </summary>
        public string DectectorIdentifier { get; set; }
        
        /// <summary>
        /// Detector channel
        /// </summary>
        public int DetectorChannel { get; set; }
        
        /// <summary>
        /// Distance from stop bar
        /// </summary>
        public int? DistanceFromStopBar { get; set; }
        
        /// <summary>
        /// Minimum speed filter
        /// </summary>
        public int? MinSpeedFilter { get; set; }
        
        /// <summary>
        /// Date added
        /// </summary>
        public DateTime DateAdded { get; set; }
        
        /// <summary>
        /// Date disabled
        /// </summary>
        public DateTime? DateDisabled { get; set; }
        
        /// <summary>
        /// Lane number
        /// </summary>
        public int? LaneNumber { get; set; }
        
        /// <summary>
        /// Movement type
        /// </summary>
        public MovementTypes MovementType { get; set; }
        
        /// <summary>
        /// Lane type
        /// </summary>
        public LaneTypes LaneType { get; set; }

        /// <summary>
        /// Detection hardware
        /// </summary>
        public DetectionHardwareTypes DetectionHardware { get; set; }
        
        /// <summary>
        /// Decision point
        /// </summary>
        public int? DecisionPoint { get; set; }
        
        /// <summary>
        /// Movement delay
        /// </summary>
        public int? MovementDelay { get; set; }
        
        /// <summary>
        /// Latency correction
        /// </summary>
        public double LatencyCorrection { get; set; }

        #region IRelatedApproach

        /// <inheritdoc/>
        public int ApproachId { get; set; }

        /// <inheritdoc/>
        public virtual Approach Approach { get; set; }

        #endregion

        #region IRelatedDetectorComments

        /// <inheritdoc/>
        public virtual ICollection<DetectorComment> DetectorComments { get; set; } = new HashSet<DetectorComment>();

        #endregion

        #region IRelatedDetectionTypes

        /// <inheritdoc/>
        public virtual ICollection<DetectionType> DetectionTypes { get; set; } = new HashSet<DetectionType>();

        #endregion

        /// <inheritdoc/>
        public override string ToString() => $"{Id} - {DectectorIdentifier} - {DetectorChannel}";
    }
}