exports.errors = {
    BAD_REQUEST: (msg) => 
    {
        return {
            code: 400,
            message: "BAD REQUEST",
            description: msg
        }
    },
    NOT_FOUND: (msg) => 
    {
        return {
            code : 404,
            message : "NOT FOUND",
            description: msg
        }
    },
    INTERNAL_SERVER_ERROR: (msg) => 
    {
        return {
            code : 500,
            message : "INTERNAL SERVER ERROR",
            description: msg
        }
    }      
}