const crypto = require('crypto')


function occlude(password) {
    let pass_extended = password + "dashboard"
    const hash = crypto.createHash('sha256');
    hash.update(pass_extended);
    let ehash = hash.digest('hex');
    return(ehash)
}


function storage_string_from_object(obj,path_key) {
    let date = (new Date()).toISOString()
    let dash_obj = {
        "user_name" : obj._email,
        "header_user_name" : obj.name,
        "date" : date,
        "dates" : {
            "created" : Date.now(),
            "updated" : Date.now()
        },
        "tag_line" : "<button id='dashboard-tagline-maker' onclick='make_dashoard_tagline(event)'>add tag line</button>",
        "panel_key" : occlude(obj.password),
        "path_key" : path_key,  /// should be "dashboard"
        "dashboard_text" : "<button id='dashboard-text-maker' onclick='make_dashoard_text(event)'>add text</button>",
        "entries" : {}
    }
    let str = JSON.stringify(dash_obj)
    return(str)
}


module.exports.generator = storage_string_from_object