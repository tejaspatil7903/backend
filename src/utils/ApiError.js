class ApiError extends Error{
    constructor(
        stausCode,
        message="Something Went Wrong",
        errors=[],
        stack = ""
    ){
        super(message)
        this.stausCode = stausCode
        this.data = null
        this.message=message
        this.success = false
        this.errors = this.errors

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}