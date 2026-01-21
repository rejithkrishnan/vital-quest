import { useAlertStore, AlertButton } from '@/stores/alertStore';

export const CustomAlert = {
    alert: (title: string, message?: string, buttons?: AlertButton[], options?: any) => {
        // This will trigger the global modal component via the store
        // We use this for BOTH web and native to ensure consistent "beautiful" UI
        useAlertStore.getState().showAlert(title, message, buttons);
    }
};
