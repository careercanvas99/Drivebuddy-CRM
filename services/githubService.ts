
import { AppData, StorageConfig } from '../types';

export class GitHubService {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  private getFullPath(path: string): string {
    const base = this.config.folderPath.replace(/^\/|\/$/g, '');
    return base ? `${base}/${path}` : path;
  }

  private async getFile(path: string): Promise<{ content: any; sha: string }> {
    const fullPath = this.getFullPath(path);
    const response = await fetch(
      `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${fullPath}`,
      {
        headers: {
          Authorization: `token ${this.config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.status === 404) {
      return { content: null, sha: '' };
    }

    if (!response.ok) {
      throw new Error(`GitHub Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = JSON.parse(atob(data.content));
    return { content, sha: data.sha };
  }

  private async saveFile(path: string, content: any, sha?: string): Promise<string> {
    const fullPath = this.getFullPath(path);
    const body = {
      message: `CRM Data Update - Admin Sync - ${new Date().toISOString()}`,
      content: btoa(JSON.stringify(content, null, 2)),
      branch: this.config.branch,
      ...(sha ? { sha } : {}),
    };

    const response = await fetch(
      `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${fullPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${this.config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save to GitHub');
    }

    const data = await response.json();
    return data.content.sha;
  }

  async fetchAllData(): Promise<AppData> {
    try {
      const tripsData = await this.getFile('trips.json');
      const usersData = await this.getFile('users.json');
      const driversData = await this.getFile('drivers.json');
      const customersData = await this.getFile('customers.json');
      const notificationsData = await this.getFile('notifications.json');

      return {
        trips: tripsData.content || [],
        users: usersData.content || [],
        drivers: driversData.content || [],
        customers: customersData.content || [],
        notifications: notificationsData.content || []
      };
    } catch (e) {
      console.error("Error fetching data:", e);
      throw e;
    }
  }

  async updateData(type: keyof AppData, newData: any): Promise<void> {
    const path = `${String(type)}.json`;
    const current = await this.getFile(path);
    await this.saveFile(path, newData, current.sha);
  }

  // Verification helper for the setup page
  static async verifyConnection(config: StorageConfig): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}`,
        {
          headers: {
            Authorization: `token ${config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
