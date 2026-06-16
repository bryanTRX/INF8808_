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

export function appStrings(lang: Lang): AppStrings {
  if (lang === 'fr') {
    return {
      navHome: 'Accueil',
      navVisualizations: 'Visualisations',
      navAria: 'Navigation principale',
      themeLight: 'Passer en mode clair',
      themeDark: 'Passer en mode sombre',
      langSwitch: 'English',
      langLabel: 'Changer la langue',
      userName: 'Analytique musicale',
      userPlan: 'Jeu de données Spotify',
      logoAlt: 'Logo MusicInsights',
      projectLabel: 'Projet INF8808E',
      chapterInsight: 'Idée clé',
      chapterGuide: 'Comment lire ce graphique',
      epilogueEyebrow: 'Fin de la visite',
      epilogueTitle: 'Des mesures aux émotions',
      epilogueBody:
        'Les chiffres ne remplacent jamais l’émotion d’une chanson, mais ils peuvent révéler les motifs que nous ressentons. Les genres suivent des motifs, la popularité récompense certaines qualités plus que d’autres, et chaque artiste laisse une empreinte.',
    };
  }

  return {
    navHome: 'Home',
    navVisualizations: 'Visualizations',
    navAria: 'Main navigation',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    langSwitch: 'Français',
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
