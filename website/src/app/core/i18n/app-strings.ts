import type { Lang } from '../services/lang.service';

export interface AppStrings {
  navHome: string;
  navVisualizations: string;
  navAria: string;
  themeLight: string;
  themeDark: string;
  langSwitch: string;
  langLabel: string;
  userName: string;
  userPlan: string;
  logoAlt: string;
  projectLabel: string;
  chapterInsight: string;
  chapterGuide: string;
  epilogueEyebrow: string;
  epilogueTitle: string;
  epilogueBody: string;
}

export function appStrings(_lang: Lang): AppStrings {
  return {
    navHome: 'Home',
    navVisualizations: 'Visualizations',
    navAria: 'Main navigation',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    langSwitch: 'Switch language',
    langLabel: 'Change language',
    userName: 'Music Analytics',
    userPlan: 'Spotify Dataset',
    logoAlt: 'MusicInsights logo',
    projectLabel: 'INF8808E Project',
    chapterInsight: 'Key insight',
    chapterGuide: 'How to read this chart',
    epilogueEyebrow: 'End of tour',
    epilogueTitle: 'From features to feeling',
    epilogueBody:
      'Numbers never replace the emotion of a song, but they can reveal the patterns we feel. Genres follow patterns, popularity rewards some traits more than others, and every artist leaves a signature.',
  };
}
