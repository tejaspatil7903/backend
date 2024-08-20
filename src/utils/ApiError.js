class ApiError extends Error{
    constructor(
        stausCode,
        message="Something Went Wrong",
        errors=[],
        statck = ""
    ){
        super(message)
        this.stausCode = stausCode
        this.data = null
        this.message=message
        this.success = false
        this.errors = this.errors

        if(statck){
            this.stack = statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}