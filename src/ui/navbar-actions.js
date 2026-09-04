import { formatGitHubCount } from '../cloudflare/index.js';

const metadataRequests = new Map();
export const navbarIcons = Object.freeze({
  github: '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>',
  discord: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.51 13.78 13.78 0 0 0-.64 1.28 18.27 18.27 0 0 0-5.5 0 12.64 12.64 0 0 0-.64-1.28h-.05A19.74 19.74 0 0 0 3.64 4.4 20.26 20.26 0 0 0 .11 18.09l.02.02a19.9 19.9 0 0 0 6.04 3.03l.04-.02a14.24 14.24 0 0 0 1.23-2.03.08.08 0 0 0-.05-.07 13.1 13.1 0 0 1-1.9-.92.08.08 0 0 1 .02-.1 10.2 10.2 0 0 0 .41-.31h.04a14.2 14.2 0 0 0 12.1 0l.04.01a9.63 9.63 0 0 0 .4.32.08.08 0 0 1-.03.1 12.29 12.29 0 0 1-1.9.91.08.08 0 0 0-.02.1 15.97 15.97 0 0 0 1.27 2.01h.04a19.84 19.84 0 0 0 6.03-3.05v-.03a20.12 20.12 0 0 0-3.57-13.69ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.1 2.16 2.42 0 1.34-.94 2.42-2.16 2.42Z" /></svg>',
});

export function defineNavbarActions(windowObject = window) {
  const { customElements, document, HTMLElement } = windowObject;
  if (customElements.get('csk-navbar-actions')) return;

  customElements.define('csk-navbar-actions', class extends HTMLElement {
    connectedCallback() {
      this.initializeMenu(windowObject, document);

      for (const link of this.querySelectorAll('a[data-csk-auto-current]')) {
        const url = new windowObject.URL(link.href, windowObject.location.href);
        const prefix = link.dataset.cskAutoCurrent === 'prefix';
        const current = url.origin === windowObject.location.origin
          && isNavbarPathCurrent(windowObject.location.pathname, url.pathname, prefix);
        if (current) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }

      for (const element of this.querySelectorAll('[data-csk-icon]')) {
        const icon = navbarIcons[element.getAttribute('data-csk-icon')];
        if (icon && !element.firstElementChild) element.innerHTML = icon;
      }

      const endpoint = this.dataset.metadataEndpoint;
      if (!endpoint || this.dataset.metadataLoaded !== undefined) return;
      this.dataset.metadataLoaded = '';

      let request = metadataRequests.get(endpoint);
      if (!request) {
        request = windowObject.fetch(endpoint).then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        });
        metadataRequests.set(endpoint, request);
      }

      request.then((metadata) => {
        const stars = metadata.stars;
        if (typeof stars === 'number') {
          const wrapper = this.querySelector('[data-csk-stars]');
          const count = this.querySelector('[data-csk-stars-count]');
          if (wrapper && count) {
            count.textContent = formatGitHubCount(stars);
            wrapper.hidden = false;
          }
        }

        const release = typeof metadata.release === 'string'
          ? metadata.release
          : typeof metadata.latestRelease === 'string'
            ? metadata.latestRelease
            : undefined;
        const releaseLink = this.querySelector('[data-csk-release]');
        const releaseBase = this.dataset.releaseBase;
        if (release && releaseLink && releaseBase) {
          releaseLink.href = typeof metadata.releaseUrl === 'string'
            ? metadata.releaseUrl
            : `${releaseBase}${encodeURIComponent(release)}`;
          releaseLink.ariaLabel = release;
          releaseLink.textContent = release;
          releaseLink.hidden = false;
        }
      }).catch(() => {});
    }

    disconnectedCallback() {
      if (!this.menuReady) return;
      this.menuButton.removeEventListener('click', this.handleMenuButtonClick);
      this.removeEventListener('click', this.handleMenuLinkClick);
      this.menuMedia.removeEventListener('change', this.handleMenuMediaChange);
      this.menuWindow.removeEventListener('keydown', this.handleMenuKeydown);
      this.menuDocument.removeEventListener('pointerdown', this.handleMenuOutsidePointer);
      this.setMenuOpen(false);
      this.menuReady = false;
    }

    initializeMenu(menuWindow, menuDocument) {
      if (this.menuReady) return;
      const menuButton = this.querySelector('[data-csk-navbar-menu-button]');
      const menuPanel = this.querySelector('[data-csk-navbar-menu-panel]');
      if (!menuButton || !menuPanel) return;

      this.menuReady = true;
      this.menuWindow = menuWindow;
      this.menuDocument = menuDocument;
      this.menuButton = menuButton;
      this.menuPanel = menuPanel;
      this.menuMedia = menuWindow.matchMedia('(min-width: 50rem)');
      this.handleMenuButtonClick = () => this.setMenuOpen(!this.hasAttribute('data-menu-open'));
      this.handleMenuLinkClick = (event) => {
        if (event.target?.closest?.('a')) this.setMenuOpen(false);
      };
      this.handleMenuMediaChange = (event) => {
        if (event.matches) this.setMenuOpen(false);
      };
      this.handleMenuKeydown = (event) => {
        if (event.key !== 'Escape' || !this.hasAttribute('data-menu-open')) return;
        this.setMenuOpen(false);
        this.menuButton.focus();
      };
      this.handleMenuOutsidePointer = (event) => {
        if (this.hasAttribute('data-menu-open') && !this.contains(event.target)) {
          this.setMenuOpen(false);
        }
      };

      menuButton.addEventListener('click', this.handleMenuButtonClick);
      this.addEventListener('click', this.handleMenuLinkClick);
      this.menuMedia.addEventListener('change', this.handleMenuMediaChange);
      menuWindow.addEventListener('keydown', this.handleMenuKeydown);
      menuDocument.addEventListener('pointerdown', this.handleMenuOutsidePointer);
    }

    setMenuOpen(open) {
      if (!this.menuReady) return;
      if (open) {
        for (const element of this.menuDocument.querySelectorAll('csk-navbar-actions[data-menu-open]')) {
          if (element !== this) element.setMenuOpen(false);
        }
        const navbar = this.closest('header, .csk-navbar');
        const top = Math.max(0, navbar?.getBoundingClientRect().bottom ?? 0);
        this.style.setProperty('--csk-navbar-menu-top', `${top}px`);
      }

      this.toggleAttribute('data-menu-open', open);
      this.menuButton.setAttribute('aria-expanded', String(open));
      const anyOpen = Boolean(this.menuDocument.querySelector('csk-navbar-actions[data-menu-open]'));
      this.menuDocument.body?.toggleAttribute('data-csk-navbar-menu-open', anyOpen);

      if (open) {
        this.menuWindow.requestAnimationFrame(() => {
          this.menuPanel.querySelector('a:not([hidden]), button:not([hidden])')?.focus();
        });
      }
    }
  });
}

export function isNavbarPathCurrent(currentPathname, linkPathname, prefix = false) {
  const currentPath = normalizePath(currentPathname);
  const linkPath = normalizePath(linkPathname);
  return currentPath === linkPath || (prefix && currentPath.startsWith(`${linkPath}/`));
}

function normalizePath(pathname) {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}
