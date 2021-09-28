function accessor_strings(field_matrix) {
    //
    let a_list = []
    let fm_copy = [].concat(field_matrix)
    let f_list = [].concat(fm_copy.shift())
    //
    while ( f_list.length ) {
        let field = f_list.shift()
        let sub_fields = fm_copy.length ? accessor_strings(fm_copy) : false
        if ( sub_fields ) {
            for ( let sfield of sub_fields ) {
                a_list.push(field + '.' + sfield)
            }    
        } else {
            a_list.push(field)
        }
    }
    //
    return (a_list)
}



let g_field_matrix = [
    [ "a", "b" ],
    [ "q", "r", "s" ]
]

let output = accessor_strings(g_field_matrix)

for ( let accessor of output ) {
    console.log(accessor)
}