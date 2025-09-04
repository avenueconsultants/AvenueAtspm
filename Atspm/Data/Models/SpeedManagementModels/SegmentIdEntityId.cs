namespace Utah.Udot.SpeedManagement.Data.Models.SpeedManagementModels.Config
{
    public class SegmentIdEntityId
    {
        public Guid EntityId { get; set; }
        public Guid SegmentId { get; set; }
        public string SourceEntityId { get; set; }
        public long SourceId { get; set; }
        public bool? NeedsRedownload { get; set; }
        public DateTime? DeletedOn { get; set; } = null;
        public virtual Segment? Segment { get; set; } = null;
        public virtual Entity? Entity { get; set; } = null;
    }
}

