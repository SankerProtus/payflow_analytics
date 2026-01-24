import api from './axios';

export const dunningAPI = {
    getList: () => {
        return api.get('/dunning');
    }
};