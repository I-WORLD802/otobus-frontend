namespace OtobusDeneyimleriAPI.Models
{
    public class BusRoute
    {
        public int Id { get; set; }
        public int OriginId { get; set; }
        public int DestinationId { get; set; }
        public string Slug { get; set; } = string.Empty;
    }
}