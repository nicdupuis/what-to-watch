export interface FestivalPrize {
  prizeName: string;
  filmTitle: string;
  director: string;
}

export interface Festival {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  url: string;
  color: string;
  notableFilms: string[];
  topPrizes: FestivalPrize[];
}
