interface Settings {
  ContributorActivity: {
    lastNDays: number;
    limit: number;
  };
}

const settings: Settings = {
  ContributorActivity: {
    lastNDays: 30,
    limit: 100,
  },
};

export default settings;
export type { Settings };
