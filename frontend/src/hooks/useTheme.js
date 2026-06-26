import { useThemeStore, selectTheme, selectIsDark, THEMES } from '../store/themeStore';

/**
 * Hook di facciata sul themeStore.
 *
 * Espone in modo ergonomico lo stato e le azioni del tema, mantenendo i
 * componenti disaccoppiati dai dettagli dello store (stessa filosofia degli
 * altri hook che incapsulano store/servizi).
 *
 * Il cambio di tema avviene in tempo reale (lo store aggiorna `data-theme` su
 * <html>): nessun refresh di pagina, compatibile con React 19 e Vite.
 *
 * @returns {{
 *   theme: 'light' | 'dark',
 *   isDark: boolean,
 *   toggleTheme: () => void,
 *   setTheme: (theme: 'light' | 'dark') => void,
 *   THEMES: { LIGHT: 'light', DARK: 'dark' }
 * }}
 */
export const useTheme = () => {
  // Selettori atomici: ogni primitiva è stabile, nessuno shallow necessario.
  const theme = useThemeStore(selectTheme);
  const isDark = useThemeStore(selectIsDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return { theme, isDark, toggleTheme, setTheme, THEMES };
};
