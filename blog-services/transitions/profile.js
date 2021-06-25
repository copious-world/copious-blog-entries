const crypto = require('crypto')


function occlude(password) {
    let pass_extended = password + "profile"
    const hash = crypto.createHash('sha256');
    hash.update(pass_extended);
    let ehash = hash.digest('hex');
    return(ehash)
}


function storage_string_from_object(obj,path_key) {
    let date = (new Date()).toISOString()
    let prof_obj = {
        "user_name" : obj._email,
        "header_user_name" : obj.name,
        "date" : date,
        "dates" : {
            "created" : Date.now(),
            "updated" : Date.now()
        },
        "tag_line" : "<button id='profile-tagline-maker' onclick='make_dashoard_tagline(event)'>add tag line</button>",
        "panel_key" : occlude(obj.password),
        "path_key" : path_key,
        "bio" : "<button id='profile-text-maker' onclick='make_profile_bio(event)'>add bio</button>",
        "image" : "<button id='profile-image-maker' onclick='make_profile_image(event)'>add image</button>",
        "entries" : {}      // in the case of the profile, these will be settings... for the user account...
    }
    let str = JSON.stringify(prof_obj)
    return(str)
}


module.exports.generator = storage_string_from_object