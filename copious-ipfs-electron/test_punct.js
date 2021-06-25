


let g_punctuation = ".,;:\'\"~\~\`@#$%^&*()+=|\\][}{?/><"

function ispunct(c,add_dash) {
    let is = (g_punctuation.indexOf(c) >= 0 )
    if ( !(is) && add_dash ) {
        is = (c == '-' || c == '_')
    }
    return is
}

function trim_punct(key,add_dash) {
    while ( (key.length > 0) && ispunct(key[0],add_dash) ) {
        key = key.substr(1)
    }
    while ( (key.length > 0) && ispunct(key[key.length - 1],add_dash) ) {
        key = key.substr(0,(key.length - 1))
    }
    return(key)
}



console.log(trim_punct("-^&*^sdhfkjshf&*(&sdfodsf*^^$^#"))

console.log(trim_punct("-^&*^sdhfkjshf&*(&sdfodsf*^^$^#",true))

console.log(trim_punct("*^^&%(*&)*^%^#$^&(*)*&*"))

