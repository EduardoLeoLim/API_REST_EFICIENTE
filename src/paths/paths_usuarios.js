const { Router } = require('express');
const path = Router();
var mysqlConnection = require('../../utils/conexion');
const keys = require('../../settings/keys');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { validarParamIdUsuario } = require('../../utils/validaciones/validarParam')
const { send, status, json } = require('express/lib/response');

const {AccesoSistema} = require('../componentes/accesosistema');
const GestionToken = require('../utils/GestionToken');

//Respuestas
const mensajes = require('../../utils/mensajes');
const req = require('express/lib/request');
const res = require('express/lib/response');
const pool = require('../../utils/conexion');

//Función para verificar el token
function verifyToken(token){
    var statusCode = 0;
    try{
        const tokenData = jwt.verify(token, keys.key); 
        console.log(tokenData);
  
        if (tokenData["tipo"] == "Administrador") {
            statusCode = 200
            //mensaje agregado: 06/06/2022
            //saber procedencia del usuario
            console.log(tokenData)
            return statusCode
        }else{
            //Caso que un token exista pero no contenga los permisos para la petición
            statusCode = 401
            return statusCode
          }
    
        } catch (error) { //Caso de un token invalido, es decir que no exista
            statusCode = 401
            return statusCode
            
        }
}

function verifyTokenUser(token){
    var statusCode = 0;
    try{
        const tokenData = jwt.verify(token, keys.key); 

        if(tokenData["tipo"] == "Empleador" || tokenData["tipo"] == "Demandante" || tokenData["tipo"] == "Aspirante" || tokenData["tipo"] == "Administrador"){
            statusCode = 200
            console.log(tokenData)
            return statusCode
        }else{
            statusCode = 401
            return statusCode
        }
    }catch (error){
        statusCode = 401
        return statusCode
    }
}

/*var almacenFotoPerfil = multer.diskStorage({
    destination: function(request,file, callback){
        callback(null, __dirname+'./../../utils/almacenFotografias')
    },
    filename:function(request, file, callback){
        console.log(file)
        callback(null, file.fieldname+'-'+Date.now()+ruta.extname(file.originalname))
    }
})*/

function consoleError(error, ubicacion){
    console.log('--------------------------------------------------------------------------------------')
    console.log('Se ha presentado un problema en: ' + ubicacion)
    console.log('Error(es): ' + error.message)
    console.log('--------------------------------------------------------------------------------------')
}

const multerUpload = multer({storage:multer.memoryStorage(), limits:{fileSize:8*1024*1024*10}})

path.patch('/v1/PerfilUsuarios/:idPerfilUsuario/fotografia', multerUpload.single("fotografia"), (req,res) => {
    var query = "UPDATE perfil_usuario SET fotografia = ? WHERE id_perfil_usuario = ?;"
    const { idPerfilUsuario } = req.params


    mysqlConnection.query(query, [req.file.buffer, idPerfilUsuario], (error, resultadoFotografia) => {
        if (error){
            console.log(error)
            res.status(500)
            res.json(mensajes.errorInterno)
        }else if(resultadoFotografia.length == 0){
            res.status(404)
            res.json(mensajes.peticionNoEncontrada)
        }else{
            res.status(200)
            res.json(mensajes.actualizacionExitosa)
        }
    })
});

path.get('/v1/iniciarSesion', (req, res) => { // listo en api
    const {nombreUsuario, clave} = req.query

    AccesoSistema.iniciarSesion(nombreUsuario, clave, (codigoRespuesta, cuerpoRespuesta) => {
        if(codigoRespuesta == 200) {
            const payloadToken = {
                "idUsuario" : cuerpoRespuesta.idPerfilUsuario,
                "clave" : cuerpoRespuesta.clave,
                "tipo" : cuerpoRespuesta.tipoUsuario
            }
            var token = GestionToken.CrearToken(payloadToken);
            res.setHeader('x-access-token', token);
        }
        res.status(codigoRespuesta).json(cuerpoRespuesta);
    });
});

path.get('/v1/perfilUsuarios', (req, res) => { // listo en api
    const token = req.headers['x-access-token'];
    var respuesta = verifyToken(token)

    try{
        if (respuesta == 200){
            var query = 'SELECT * FROM perfil_usuario;'

            mysqlConnection.query(query, (error, resultadoUsuarios) =>{
                if (error){
                    consoleError(error, 'funcion: catalogo usuarios. Paso: consultar todos los usuarios')

                    res.status(500)
                    res.json(mensajes.errorInterno)
                }else if (resultadoUsuarios.length == 0){
                    res.status(404)
                    res.json(mensajes.peticionNoEncontrada)
                }else{
                    var cont = 0 
                    var usuarios = []
    
                    do{
                        usuarios.push(cont)
    
                        usuarios[cont] = {
                            'idPerfilUsuario' : resultadoUsuarios[cont]['id_perfil_usuario'],
                            'nombreUsuario': resultadoUsuarios[cont]['nombre_usuario'],
                            'estatus': resultadoUsuarios[cont]['estatus'],
                            'clave': resultadoUsuarios[cont]['clave'],
                            'correoElectronico' : resultadoUsuarios[cont]['correo_electronico'],
                            'tipoUsuario' : resultadoUsuarios[cont]['tipo_usuario']
                        }
                        cont ++;
                    } while(cont < resultadoUsuarios.length)
    
                    res.status(200)
                    res.json(usuarios)
                }
            })
        }else if (respuesta == 401){
            res.status(respuesta)
            res.json(mensajes.tokenInvalido)
        }else{
            res.status(500)
            res.json(mensajes.errorInterno)
        }
    }catch (error){
        consoleError(error, 'funcion: catalogo usuarios. Paso: excepcion cachada')

        res.status(500)
        res.json(mensajes.errorInterno)
    }

});

path.get('/v1/PerfilUsuarios/:idPerfilUsuario',(req, res) => {  // listo api
    const token = req.headers['x-access-token']
    var respuesta = verifyTokenUser(token)

    const { idPerfilUsuario } = req.params

    if(respuesta == 200){
        var query = 'SELECT * FROM perfil_usuario WHERE id_perfil_usuario = ?;'

        mysqlConnection.query(query, [idPerfilUsuario], (error, resultadoUsuario) => {
            if(error){ 
                res.status(500)
                res.json(mensajes.errorInterno)
            }else if(resultadoUsuario.length == 0){
    
                res.status(404)
                res.json(mensajes.peticionNoEncontrada)
     
            }else{
                var arrayFotografia = null
                if (resultadoUsuario[0].fotografia == null){
                    console.log('Fotografia vacia, se procede a poner null')
                }else{
                    arrayFotografia = Uint8ClampedArray.from(Buffer.from(resultadoUsuario[0].fotografia.buffer, 'base64'))
                }
                var usuario = resultadoUsuario[0]

                const getUsuario = {};
                getUsuario['application/json'] = {
                    "clave" : usuario['clave'],
                    "estatus" : usuario['estatus'],
                    "idPerfilusuario" : usuario['id_perfil_usuario'],
                    "correoElectronico" : usuario['correo_electronico'],
                    "fotografia" : arrayFotografia,
                    "nombre": usuario['nombre_usuario'],
                    "tipoUsuario" : usuario['tipo_usuario'],
                };

                res.status(200);
                res.json(getUsuario['application/json'])
            }
        })
    }else if (respuesta == 401){
        res.status(respuesta)
        res.json(mensajes.tokenInvalido)
    }else{
        res.status(500)
        res.json(mensajes.errorInterno)
    }
});

path.patch('/v1/restablecer', (req, res) => {
    //UNDER CONSTRUCTION
});


path.patch('/v1/perfilUsuarios/:idPerfilUsuario/habilitar', (req, res) => {  // listo api
    try{
        const token = req.headers['x-access-token'];
        var validacionToken = GestionToken.ValidarToken(token);
        //var respuesta = verifyTokenUser(token);
        const { idPerfilUsuario } = req.params;

        if (validacionToken.statusCode == 200) {
            AccesoSistema.habilitarPerfil(idPerfilUsuario, (codigoRespuesta, cuerpoRespuesta) => {
                res.status(codigoRespuesta).json(cuerpoRespuesta);
            });
        } else if(respuesta == 401){
            res.status(respuesta).json(mensajes.tokenInvalido);
        } else {
            res.status(500).json(mensajes.errorInterno);
        }
        /*
        if(respuesta == 200){
            var query = 'UPDATE perfil_usuario SET estatus = ? WHERE id_perfil_usuario = ?;'

            mysqlConnection.query(query, [1, idPerfilUsuario], (error, resultadoHabilitar) => {
                if(error){
                    consoleError(error, 'Funcion: Habilitar perfil. Paso: error al habilitar perfil')
                    
                    res.status(500)
                    res,json(mensajes.errorInterno)
                }else if(resultadoHabilitar.length == 0){
                    res.status(404)
                    res.json(mensajes.peticionNoEncontrada)
                }else{
                    const idPerfilHabilitado = {}

                    idPerfilHabilitado['application/json'] = {
                        "idPerfilusuario" : idPerfilUsuario,
                        "estatus" : 1
                    };

                    res.status(200)
                    res.send(idPerfilHabilitado['application/json'])
                }
            })
        }else if(respuesta == 401){
            res.status(respuesta)
            res.json(mensajes.tokenInvalido)
        }else{
            res.status(500)
            res.json(mensajes.errorInterno)
        }*/
    }catch (error){
        consoleError(error, 'Funcion: Habilitar perfil. Paso: Excepcion cachada')

        res.status(500)
        res.json(mensajes.errorInterno)
    }

});

path.patch('/v1/perfilUsuarios/:idPerfilUsuario/deshabilitar', (req, res) => { // listo api
    const token = req.headers['x-access-token'];
    var respuesta = verifyTokenUser(token)
    const { idPerfilUsuario } = req.params

    try{
        if (respuesta == 200){
            var query = 'UPDATE perfil_usuario SET estatus = ? WHERE id_perfil_usuario = ?;'

            mysqlConnection.query(query, [2, idPerfilUsuario], (error, resultadoDeshabilitar) => {
                if(error){
                    consoleError(error, 'Funcion: Deshabilitar usuario. Paso: error al deshabilitar')
                    
                    res.status(500)
                    res,json(mensajes.errorInterno)
                }else if(resultadoDeshabilitar.length == 0){
                    res.status(404)
                    res.json(mensajes.peticionNoEncontrada)
                }else{
                    const idPerfilDeshabilitado = {}

                    idPerfilDeshabilitado['application/json'] = {
                        "idPerfilusuario" : idPerfilUsuario,
                        "estatus" : 2
                    };

                    res.status(200)
                    res.send(idPerfilDeshabilitado['application/json'])
                }
            })
        }else if (respuesta == 401){
            res.status(respuesta)
            res.json(mensajes.tokenInvalido)
        }else{
            res.status(500)
            res.json(mensajes.errorInterno)
        }
    }catch (error){
        consoleError(error, 'Funcion: deshabilitar perfil. Paso: Excepcion cachada.')

        res.status(500)
        res.json(mensajes.errorInterno)
    }
});


module.exports = path;