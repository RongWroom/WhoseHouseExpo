export interface HouseProfileResident {
  name: string;
  role: string;
  photoUrl?: string;
}

export interface HouseProfile {
  photos: string[];
  welcomeMessage: string;
  room: {
    headline: string;
    details: string[];
    photoUrl?: string;
  };
  house: {
    livingRoom: string;
    kitchen: string;
    garden: string;
    pets: string;
  };
  residents: HouseProfileResident[];
  lastUpdated?: string;
}
