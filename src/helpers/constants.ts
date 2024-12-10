export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// export const PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;
export const PHONE_PATTERN = /^^(?:\+38)?(?:\(044\)[ .-]?[0-9]{3}[ .-]?[0-9]{2}[ .-]?[0-9]{2}|044[ .-]?[0-9]{3}[ .-]?[0-9]{2}[ .-]?[0-9]{2}|044[0-9]{7})$$/;
export const USERNAME_PATTERN =
    /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'<>,.?\/\\|`~\-\sА-Яа-яЄєІіЇїҐґ]{2,32}$/;

export const NAME_PATTERN =
    /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'<>,.?\/\\|`~\-\sА-Яа-яЄєІіЇїҐґ]{2,32}$/;

export const CLOUD_STORAGE = 'https://storage.cloud.google.com/';