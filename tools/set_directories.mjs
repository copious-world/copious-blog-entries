
import 'fs';
import { promises as fsPromises } from 'fs';



function subst(template,port_formula,value) {
    while ( template.indexOf(port_formula) >= 0 ) {
        template = template.replace(port_formula,value)
    }
    return template
}


let g_template_dir = false

if ( process.argv[2] !== undefined ) {
    g_template_dir = process.argv[2]
}


let all_templates = {}

let g_persistence_address = {
    "relay_address" : "localhost",
    "user_address" : "localhost",
    "persistence_address" : "localhost",
    "paid_persistence_address" : "localhost"
}

let g_counting_service_address = {

}

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
let g_persistence_ports = {
    "relay_port" : 5112,
    "user_port" : "{relay_port} + 2",
    "persistence_port" : "{relay_port} + 4",
    "paid_persistence_port" : "{relay_port} + 6",
    "persistence_swarm_tcp" : 4026,
    "persistence_swarm_ws" : "{persistence_swarm_tcp} + 1",
    "persistence_api_port" : "{persistence_swarm_tcp} + 1000",
    "persistence_tcp_gateway" : 9294,
    "paid_persistence_swarm_tcp" : "{persistence_swarm_tcp} + 2",
    "paid_persistence_swarm_ws" : "{persistence_swarm_ws} + 2",
    "paid_persistence_api_port" : "{paid_persistence_swarm_tcp} + 1000",
    "paid_persistence_tcp_gateway" : "{persistence_tcp_gateway} + 2",
}


let g_counting_service_ports = {
}

let g_streamer_service_ports = {
}

let g_link_server_ports = {
}


// ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
let g_all_ports = {
    "persistence" : g_persistence_ports,
    "counting_service" : g_counting_service_ports,
    "streamers" : g_streamer_service_ports,
    "linkers" : g_link_server_ports
}


let g_all_addresses = {
    "persistence" : g_persistence_address,
    "counting_service" : g_counting_service_address
}


// ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
let def_publication_directories = {
    "blog" :  "higglepot/persistence/blog",
    "stream" :  "higglepot/persistence/stream",
    "demo" :  "higglepot/persistence/demo",
    "links" :  "higglepot/persistence/links",
    
    "contacts" : "higglepot/persistence/links",
    "ownership" : "higglepot/persistence/ownership",
    "wallet" : "higglepot/persistence/wallet",
    "assets" :  "higglepot/persistence/assets"
}


// ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
let def_paid_publication_directories = {
    "blog" :  "golddigger/paid-persistence/blog",
    "stream" :  "golddigger/paid-persistence/stream",
    "demo" :  "golddigger/paid-persistence/demo",
    "links" :  "golddigger/persistence/links",
    
    "contacts" : "golddigger/paid-persistence/links",
    "ownership" : "golddigger/paid-persistence/ownership",
    "wallet" : "golddigger/paid-persistence/wallet",
    "assets" :  "golddigger/paid-persistence/assets"
}





let g_dir_list = {
    "counter" :  { 
        "user_directory" :  "test/assets/streamers",
        "freemium" : {
            "field" : "updating_records_directory",
            "dir_list" : def_publication_directories
        },
        "paid" : {
            "field" : "updating_records_directory",
            "dir_list" : def_paid_publication_directories,
        }    
    },
    "persistence" : {
        "user_directory" :  "test/assets/users",
        "freemium" : {
            "dir_list" : def_publication_directories
        },
        "paid" : {
            "dir_list" : def_paid_publication_directories,
        }    
    }
}





let configs = {
    "many-counter-servers" : {
        "file_formula" : "$business$_$type$_counter-service.conf",
        "output_dir" : "./tools/output",
        "types" : [ "blog", "demo", "stream" ],
        "business_models" : [ "paid", "freemium" ],
        "input_template" : "counter-service.conf",
        "dir_list_access" : "counter",
        "port_access" : "counting_service",
        "port_expansion" : {
            "keys" : [ "types", "business_models" ],
            "start" : 6567,
            "record" : g_counting_service_ports,
            "fields" : [ "counting_service_port", "counter_port" ]
        }
    },
    "one-endpoint-servers" : {
        "file_formula" : "relay-service.conf",
        "output_dir" : "./tools/output",
        "types" : "derive[path] + _endpoint",
        "path" : [
            "user", "persistence", "paid_persistence"
        ],
        "business_models" : [ "paid", "freemium" ],
        "input_template" : "relay-service.conf",
        "targets" : [ "publication_directories" ],
        "dir_list_access" : "persistence",
        "port_access" : "persistence",
        "address_access" : "persistence"        
    },
    "many-link-servers" : {
        "file_formula" : "config_$type$_server.conf",
        "output_dir" : "./tools/output",
        "data_dir" : "./test/data",
        "pre_process_vars" : {  "$type" : "types", "$server_path" : "data_dir" },
        "types" : [ "blog", "demo", "stream" ],
        "input_template" : "link-service.conf",
        "port_access" : "linkers",
        "port_expansion" : {
            "keys" : [ "types" ],
            "start" : 3000,
            "record" : g_link_server_ports,
            "fields" : [ "link_server_port" ]
        }
    },
    "many-streamer-servers" : {
        "file_formula" : "$type$_streamer.conf",
        "output_dir" : "./tools/output",
        "types" : [ "image", "sound", "video" ],
        "input_template" : "media-service.conf",
        "dir_list_access" : "streamer",
        "port_access" : "streamers",
        "pre_process_vars" : {  "$type" : "types" },
        "port_expansion" : {
            "keys" : [ "types" ],
            "calc" : {
                "media_port" : {
                    "start" : 2011,
                    "by" : 10,
                    "current" : 2011
                }, 
                "swarm_tcp_port" : {
                    "start" : 4012,
                    "by" : 2,
                    "current" : 4012
                }, 
                "swarm_ws_port" : {
                    "start" : 4013,
                    "by" : 2,
                    "current" : 4013
                }, 
                "api_port" : {
                    "start" : 5012,
                    "by" : 2,
                    "current" : 5012
                },
                "tcp_gateway_port" : {
                    "start" : 9191,
                    "by" : 1,
                    "current" : 9191
                }
            },
            "record" : g_streamer_service_ports,
            "fields" : [ "media_port", "swarm_tcp_port", "swarm_ws_port", "api_port", "tcp_gateway_port" ]
        }
    }
}



function trace_all(field_name,obj,collector) {
    for ( let field in obj ) {
        let sub_obj = obj[field]
        if ( field === field_name ) {
            collector.push(sub_obj)
        } else {
            if ( typeof sub_obj === "object" ) {
                trace_all(field_name,sub_obj,collector)
            }
        }
    }
}

// ---- ---- ---- ---- ---- ---- ---- ----
//


function get_port_value(port,access_ports) {
    let port_table = g_all_ports[access_ports]

    let [subfields,port_field] = port.split(access_ports)

    port_field = access_ports + port_field

    let [b_model,type] = subfields.split('_')
    b_model  = b_model === 'free' ? 'freemium' : b_model

    let subdef = port_table[type]
    if ( subdef === undefined ) return (Math.floor(Math.random()*300) + 6000)
    subdef = subdef[b_model]
    if ( subdef === undefined ) return (Math.floor(Math.random()*300) + 6000)
    let pvalue = subdef[port_field]
    return pvalue
}


// ---- ---- ---- ---- ---- ---- ---- ----
//
function fix_counter_links(output_obj) {
    let target_fields = []
    trace_all('counting_service',output_obj,target_fields)
    for ( let def_obj of target_fields ) {
        for ( let field in def_obj ) {
            let val = def_obj[field]
            val = subst(val,'$field$',field)
            let addr_parts = val.split(':')
            let addr = addr_parts[0]
            let port = addr_parts[1]
            val = val.replace(addr,"localhost")                         // VERY SPECIFIC
            let port_value = get_port_value(port,'counting_service')
            val = val.replace(port,port_value) 
            def_obj[field] = val
        }
    }
}

/*
"blog" : "$counting_service_$field$_address:$free_counting_service_$field$_port",
"stream" : "$counting_service_$field$_address:$free_counting_service_$field$_port",
"demo" : "$counting_service_$field$_address:$free_counting_service_$field$_port",
"links" : "$counting_service_$field$_address:$free_counting_service_$field$_port"
*/

// ---- ---- ---- ---- ---- ---- ---- ----
//
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


function port_expansions(conf_project) {
    let expander = conf_project.port_expansion
    if ( expander ) {
        let target = expander.record
        let start = expander.start

        let field_matrix = []
        for ( let flist of expander.keys ) {
            let ary = conf_project[flist]
            field_matrix.push(ary)
        }
        field_matrix.push(expander.fields)
        //
        let field_lists = accessor_strings(field_matrix)
        //
        if ( start !== undefined ) {
            for ( let field_path of field_lists ) {
                let field_list = field_path.split('.')
                let v_point = target
                while ( field_list.length ) {
                    let field = field_list.shift()
                    if ( field_list.length === 0 ) v_point[field] = start++
                    else if ( v_point[field] == undefined ) {
                        v_point[field] = {}
                    }
                    v_point = v_point[field]
                }
            }
            //
        } else if ( expander.calc ) {
            let calc_table = expander.calc
            for ( let field_path of field_lists ) {
                let field_list = field_path.split('.')
                let v_point = target
                while ( field_list.length ) {
                    let field = field_list.shift()
                    if ( field_list.length === 0 ) {
                        let calc_obj = calc_table[field]
                        v_point[field] = calc_obj.current
                        calc_obj.current = do_simple_op('+',calc_obj.current,calc_obj.by)
                    } else if ( v_point[field] == undefined ) {
                        v_point[field] = {}
                    }
                    v_point = v_point[field]
                }
            }            
        }
    }
}




if ( g_template_dir ) {
    let file_list = await fsPromises.readdir(g_template_dir)
    if ( file_list ) {
        for ( let file of file_list ) {
            let file_path = `${g_template_dir}/${file}`
            all_templates[file_path] = {}
        }
    }
}


function op_on_s(s,out_op) {
    let op_n_par = out_op.split(' ')
    let str = op_n_par[1].trim()
    let op = op_n_par[0].trim()
    switch (op) {
        case "+" : {
            return s + str
        }
        default: {
            break;
        }
    }
    return ""
}


function derive_types(types,conf_project) {
    if ( conf_project === undefined ) return types
    let pars = types.replace("derive[",'')  //"derive[path] + _endpoint"
    //
    pars = pars.split(']')
    pars = pars.map(el => { return el.trim() })
    let field = pars[0]
    let src = conf_project[field]
    let out_types = pars[1]
    if ( Array.isArray(src) ) {
        let out_op = out_types
        out_types = src.map( s => {
            return op_on_s(s,out_op)
        })
    }

    return out_types
}


function do_simple_op(op,value,factor) {
    switch ( op ) {
        case "+" : return(value + factor)
        case "-" : return(value - factor)
        case "*" : return(value * factor)
        case "/" : return(Math.floor(value/factor))
        default : {
            return(value + factor) 
        }
    }
}

function extract_field_var(port_def) {
    let field = ''
    let i = 1
    while ( i < port_def.length ) {
        let c = port_def[i]
        if ( c === '}') break
        field += c 
        i++
    }
    return field.trim()
}


function eval_port_list_formula(port_formula,port_list) {
    let parts = port_formula.split(' ')
    let field = extract_field_var(parts[0])
    let pre_value = port_list[field]
    if( pre_value[0] === '{' ) {
        pre_value = eval_port_list_formula(pre_value,port_list)
    }
    let value = parseInt(pre_value)
    let factor = parseInt(parts[2])
    let op = parts[1]
    value = do_simple_op(op,value,factor)
    return value
}

function subst_on_ports(template,port_list) {
    //
    for ( let port_key in port_list ) {
        let subst_var = `$${port_key}`
        let port_formula = port_list[port_key]
        let value = port_formula
        //
        if ( typeof port_formula === "string" ) {
            // "{relay_port} + 4",
            if ( port_formula[0] === '{' ) {
                value = eval_port_list_formula(port_formula,port_list)
            } else {
                value = port_list[port_formula]
            }
        }

console.log(subst_var,value)
        template = subst(template,subst_var,value)
    }

    return template
}



function payment_selector(template,key_list) {
    let ii = key_list.indexOf('freemium')
    if ( ii > 0 ) {
        template = subst(template,"$pay_select","free")
    } else {
        template = subst(template,"$pay_select","paid")
    }
    return template
}




function process_addesses_single(template,conf_project) {
    // g_all_addresses
    let addr_map_key = conf_project.address_access
    if ( addr_map_key ) {
        let address_list = g_all_addresses[conf_project.address_access]
        for ( let addr in address_list ) {
            let subst_var = `$${addr}`
            let addr_formula = address_list[addr]
            template = subst(template,subst_var,addr_formula)
        }
    }

    return template
}

// "pre_process_vars" : {  "$type" : "types" }
function selected_vars(template,conf_project,key_list) {
    if ( conf_project.pre_process_vars ) {
        for ( let ky in conf_project.pre_process_vars ) {
            let source_field = conf_project.pre_process_vars[ky]
            let source = conf_project[source_field]
            let value = false
            if ( Array.isArray(source) ) {
                for ( let kyspec of key_list ) {
                    if ( source.indexOf(kyspec) >= 0 ) {
                        value = kyspec
                        break;
                    }
                }    
            } else {
                value = source
            }
            if ( value ) {
                template = subst(template,ky,value)
            }
        }
    }
    return template
}


// ----  ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
function process_ports_single(template,conf_project) {
    //
    let port_map_key = conf_project.port_access
    let port_list = false
    if ( typeof port_map_key === "string" ) {
        port_list = g_all_ports[port_map_key]
    }
    //
    if ( port_list ) {
        template = subst_on_ports(template,port_list)
    }

    return template
}


function process_ports_many(template,conf_project,key_list) {
    //
    let port_map_key = conf_project.port_access
    let port_list = false
console.log(port_map_key)
    if ( typeof port_map_key === "string" ) {
        port_list = g_all_ports[port_map_key]
        for ( let key of key_list ) {
            port_list = port_list[key]
            if ( port_list === undefined ) break
        }
    }
    //
    if ( port_list ) {
        template = subst_on_ports(template,port_list)
    }
    return template
}


function template_transform_singles(template,conf_project) {
    if ( conf_project.port_access ) {
console.log("template_transform_singles")
console.dir(conf_project)
        template = process_ports_single(template,conf_project)
        template = process_addesses_single(template,conf_project)
    }
    //
    return template
}


function template_transform_many(template,conf_project,key_list) {
    if ( conf_project.port_access ) {
        template = selected_vars(template,conf_project,key_list)
        template = process_ports_many(template,conf_project,key_list)
        template = payment_selector(template,key_list)
    }
    //
    return template
}




// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
function set_dirs(dir_list,dir_defs,b_model) {
    let target_def = g_dir_list[dir_defs]
    if ( (target_def === undefined) || (b_model && target_def[b_model] === undefined) ) return
    let dirs = b_model ? target_def[b_model].dir_list : target_def.dir_list
    if ( dirs === undefined ) return
    let model_field = target_def[b_model] ? target_def[b_model].field : target_def.field
    for ( let dir in dirs ) {
        let field = model_field ? model_field : dir
        dir_list[field] = dirs[dir]
    }
}


// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
function set_dirs_type(dir_list,dir_defs,b_model,type) {
    let target_def = g_dir_list[dir_defs]
    if ( (target_def === undefined) || (b_model && target_def[b_model] === undefined) ) return
    let dirs = b_model ? target_def[b_model].dir_list : target_def.dir_list
    if ( dirs === undefined ) return
    let model_field = target_def[b_model] ? target_def[b_model].field : target_def.field
    let field = model_field ? model_field : type
    dir_list[field] = dirs[type]
}


// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
async function ops_on_configs() {
    console.log("\n\n")
    for ( let cp_key in configs ) {
        let [control,target,type_of_process] = cp_key.split('-')
        let conf_project = configs[cp_key]
        //
        let file_formula = conf_project.file_formula
        let input_file = `${g_template_dir}/${conf_project.input_template}`
        //
        let output_dir = conf_project.output_dir
        //
        let file_object = false
        let template = false
        try {
            let file_data = await fsPromises.readFile(input_file,'ascii')
            template = file_data.toString()    
        } catch (e) {
            console.log("could not open " + input_file)
        }
        //
        if ( !template ) continue;
        //
        let types = conf_project.types
        if ( typeof types === 'string' ) {
            if ( types.indexOf("derive") === 0 ) {
                types = derive_types(types,conf_project)
            } else {
                types = [types]
            }
        }
        let bmodels = conf_project.business_models
        let dir_defs = conf_project.dir_list_access
        //
        let output_obj = {}
        //
        switch ( control ) {
            case "one" : {
                let output_file_name = file_formula
                console.log("\n->")
                console.log("op on fields:")
                console.log("\tinput: " + input_file)
                console.log("\toutput: " + output_file_name)
                console.log("------------------------------------------")
                //
                template = template_transform_singles(template,conf_project)
//console.log(template)
                try {
                    file_object = JSON.parse(template)
                } catch (e) {
    console.log(e)
                    break;
                }
                if ( !file_object ) break;

                //console.dir(file_object)
                if ( bmodels ) {
                    for ( let type of types ) {
                        for ( let bus_model of bmodels ) {
                            let sub_services_conf = file_object[type]
                            if ( conf_project.targets ) {
                                console.log("\t\tfield: " + type)
                                for ( let t of conf_project.targets ) {
                                    if ( sub_services_conf[t] !== undefined ) {
                                        let transformable = sub_services_conf[t]
                                        if ( dir_defs ) {
                                            set_dirs(transformable,dir_defs,bus_model)
                                        }
                                    } else {
                                        console.log("no specified transform fields\n")
                                    }
                                }
                            } else {
                                console.log("no specified targets\n")
                            }    
                        }
                    }
                } else {
                    for ( let type of types ) {
                        let sub_services_conf = file_object[type]
                        if ( conf_project.targets ) {
                            console.log("\t\tfield: " + type)
                            for ( let t of conf_project.targets ) {
                                if ( sub_services_conf[t] !== undefined ) {
                                    let transformable = sub_services_conf[t]
                                    if ( dir_defs ) {
                                        set_dirs(transformable,dir_defs,bus_model)
                                    }
                                } else {
                                    console.log("no specified transform fields\n")
                                }
                            }
                        } else {
                            console.log("no specified targets\n")
                        }
                    }    
                }
console.log("FIX COUNTER LINK")
                //
                fix_counter_links(file_object)
                let output_file = `${output_dir}/${output_file_name}`
                let output  = JSON.stringify(file_object,null,2)
                await fsPromises.writeFile(output_file,output)
                //
                break;
            }
            case "many" : {
                console.log("template transform:")
                console.log("input: " + input_file)
                port_expansions(conf_project)
                let save_template = "" + template
                if ( bmodels ) {
                    for ( let type of types ) {
                        for ( let bus_model of bmodels ) {

                            template = template_transform_many(save_template,conf_project,[type,bus_model])

                            try {
                                file_object = JSON.parse(template)
                            } catch (e) {
                                break;
                            }
            
                            //
                            let output_file_name = file_formula.replace('$type$',type).replace('$business$',bus_model)
                            console.log("\n->")
                            console.log("\toutput: " + output_file_name)
                            console.log("------------------------------------------")
                            if ( dir_defs ) {
                                set_dirs_type(file_object,dir_defs,bus_model,type)
                            }

                            let output_file = `${output_dir}/${output_file_name}`
                            let output  = JSON.stringify(file_object,null,2)
                            await fsPromises.writeFile(output_file,output)

                            console.log("++++++++++++++++++++++++++++++++++++++++++")    
                        }
                    }
                } else {
                    for ( let type of types ) {

                        template = template_transform_many(save_template,conf_project,[type])

                        try {
                            file_object = JSON.parse(template)
                        } catch (e) {
                            break;
                        }

                        //
                        let output_file_name = file_formula.replace('$type$',type)
                        console.log("\n->")
                        console.log("\toutput: " + output_file_name)
                        console.log("------------------------------------------")
                        if ( dir_defs ) {
                            set_dirs_type(file_object,dir_defs,false,type)
                        }

                        let output_file = `${output_dir}/${output_file_name}`
                        let output  = JSON.stringify(file_object,null,2)
                        await fsPromises.writeFile(output_file,output)
        
                        console.log("++++++++++++++++++++++++++++++++++++++++++")
                    }
                }


                break;
            }
            default: {
                console.log("miss")
                break;
            }
        }
        console.log("===========================================\n\n")
    }
}



ops_on_configs()


