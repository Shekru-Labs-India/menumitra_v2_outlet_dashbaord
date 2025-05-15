import axios from 'axios';

export class UpdateService {
  static async checkForUpdates() {
    try {
      const response = await axios.post('https://men4u.xyz/common_api/check_version', {
        app_type: "statistics_dashboard"
      });

      console.log('Version check response:', response.data);

      // Set current version
      const currentVersion = '1.3'; // Current app version

      // If response is not success or app_type doesn't match, treat as version mismatch
      if (response.data.st !== 1) {
        return {
          hasUpdate: true,
          error: 'Invalid application type or server response',
          currentVersion,
          serverVersion: 'Unknown',
          message: response.data.msg || 'Please update your application'
        };
      }

      // Extract version from response message or use direct version if available
      const serverVersion = response.data.version || response.data.msg?.match(/\d+\.\d+\.\d+/)?.[0];

      console.log('Versions:', { current: currentVersion, server: serverVersion });

      if (!serverVersion) {
        return {
          hasUpdate: true,
          error: 'Could not determine server version',
          currentVersion,
          serverVersion: 'Unknown',
          message: 'Application version mismatch detected'
        };
      }

      // Check if versions are exactly equal
      const hasUpdate = currentVersion !== serverVersion;
      console.log('Update required:', hasUpdate);

      return {
        hasUpdate,
        currentVersion,
        serverVersion,
        message: hasUpdate ? 'New version available' : 'Application is up to date'
      };

    } catch (error) {
      console.error('Error checking for updates:', error);
      return { 
        hasUpdate: true, 
        error: error.message,
        currentVersion: '1.2',
        serverVersion: 'Unknown',
        message: 'Unable to verify application version'
      };
    }
  }

  static isValidVersion(version) {
    if (!version) return false;
    const versionRegex = /^\d+\.\d+(\.\d+)?$/;
    return versionRegex.test(version);
  }

  static compareVersions(current, server) {
    if (!current || !server) return false;
    return current !== server; // Return true if versions are different
  }
}
