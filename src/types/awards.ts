export interface AwardNominee {
  title: string;
  person?: string;
}

export interface AwardCategory {
  name: string;
  winner: AwardNominee | null;
  nominees: AwardNominee[];
}

export interface AwardCeremony {
  id: string;
  name: string;
  shortName: string;
  date: string;
  color: string;
  categories: AwardCategory[];
}
