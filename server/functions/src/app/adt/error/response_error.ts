export interface ResponseError {
    status_code: number,
    error: string,
    message_type: "json"|"string"|"empty",
    message: string|Object|null
}

export function parseResponseError(e: any): ResponseError {
    // default error
    let resError: ResponseError = {
        status_code: 500,
        error: 'unknown_error',
        message_type: 'empty',
        message: null
    };

    // parse status code
    if (e?.status) { // general
        resError.status_code = e.status;
    }
    else if (e?.status_code) { // self-parse
        resError.status_code = e.status_code;
    }
    else if (e.response?.status) { // Spotify error format
        resError.status_code = e.response.status;
    }
    
    // parse error type
    if (e?.error) { // general & self-parse
        resError.error = e.error;
    }
    else if (e?.response?.data?.error) { // Spotify error format
        resError.error = e.response.data.error;
    }

    // parse message & message type
    if (e?.message) { // general & self-parse
        resError.message = e.message;
    }
    else if (e?.response?.data?.error_description) { // Spotify error format
        resError.message = e?.response?.datra.error_description;
        if (typeof(resError.message) === 'string') {
            resError.message_type = 'string';
        }
        else {
            resError.message_type = 'json';
        }
    }

    return resError;
}