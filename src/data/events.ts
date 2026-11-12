
export type Campus = "Rangsit" | "Tha Prachan";

export type Category =
  | "Music"
  | "Workshop"
  | "Volunteer"
  | "Sports";

export type Event = {
  id: string;
  title: string;
  club: string;
  date: string;
  campus: Campus;
  category: Category;
  image: string;
  location: string;
  time: string;
  description: string;
  capacity: number;
  registered: number;
};

export const events: Event[] = [
  {
    id: "1",
    title: "TU Music Festival",
    club: "TU Music Club",
    date: "20 OCT 2026",
    campus: "Rangsit",
    category: "Music",
    image:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
    location: "Rangsit Campus",
    time: "17:00 - 21:00",
    description:
      "Join us for an evening of live music, performances, and campus creativity. Meet fellow music lovers and enjoy an unforgettable night together.",
    capacity: 150,
    registered: 85,
  },
  {
    id: "2",
    title: "Creative Art Workshop",
    club: "TU Art Society",
    date: "24 OCT 2026",
    campus: "Tha Prachan",
    category: "Workshop",
    image:
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800",
    location: "Tha Prachan Campus",
    time: "13:00 - 16:00",
    description:
      "Explore your creativity through hands-on art activities. No previous experience is required. Everyone is welcome.",
    capacity: 40,
    registered: 26,
  },
  {
    id: "3",
    title: "Volunteer for Change",
    club: "TU Volunteer Club",
    date: "28 OCT 2026",
    campus: "Rangsit",
    category: "Volunteer",
    image:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800",
    location: "Rangsit Campus",
    time: "09:00 - 15:00",
    description:
      "Make a difference with the TU volunteer community. Take part in meaningful activities and connect with people who care.",
    capacity: 60,
    registered: 42,
  },
  {
    id: "4",
    title: "Campus Sports Day",
    club: "TU Sports Club",
    date: "02 NOV 2026",
    campus: "Rangsit",
    category: "Sports",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
    location: "Rangsit Sports Center",
    time: "08:00 - 17:00",
    description:
      "A day of sports, teamwork, and friendly competition. Join activities, meet new friends, and celebrate campus spirit.",
    capacity: 200,
    registered: 120,
  },
];
