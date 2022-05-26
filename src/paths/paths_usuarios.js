const { Router } = require('express');
const path = Router();
var mysqlConnection = require('../../utils/conexion');
const keys = require('../../settings/keys');
const jwt = require('jsonwebtoken');
const { send, status } = require('express/lib/response');

//Respuestas
const errorInterno = {
    "resBody" : {
    "menssage" : "error interno del servidor"
    }
}

const tokenInvalido = {
    "resBody" : {
    "menssage" : "token invalido"
    }
}

const peticionIncorrecta = {
    "resBody" : {
    "menssage" : "peticion no encontrada"
    }
}

//Función para verificar el token
function verifyToken(token){
    var statusCode = 0;
    try{
        const tokenData = jwt.verify(token, keys.key); 
        console.log(tokenData);
  
        if (tokenData["tipo"] == "Administrador") {
            statusCode = 200
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

path.get('/v1/iniciarSesion/:nombreUsuario/:clave', (req, res) => {
    var pool = mysqlConnection;

    pool.query('SELECT * FROM perfil_usuario WHERE nombre_usuario = ? AND clave = ?;', [req.params.nombreUsuario, req.params.clave], (error, rows)=>{
        if(error){ 
            res.json(errorInterno);
            res.status(500)

        }

        if(rows.length == 0){

            res.status(404)
            res.json(peticionIncorrecta);

            console.log("¡Metiste credenciales incorrectas subnormal!");
        }else{
            var usuario = rows[0];

            const payload = {
                "idUsuario" : usuario['id_perfil_usuario'],
                "clave" : usuario['clave'],
                "tipo" : usuario['tipo_usuario']
            }
            
            const token = jwt.sign(payload, keys.key, { expiresIn: 60 * 60 * 24
              });

            console.log("¡Inicio de sesión exitosa!");

            const resultadoJson = {};
            resultadoJson['application/json'] = {
                "resBody" : {
                "clave" : usuario['clave'],
                "tipo" : usuario['tipo_usuario'],
                "estatus" : usuario['estatus'],
                "idPerfilusuario" : usuario['id_perfil_usuario'],
                "correoElectronico" : usuario['correo_electronico'],
                "fotografia" : usuario['fotografia'],
                "tipoUsuario" : usuario['tipo_usuario'],
                "token" : token
                }
            };
            res.status(200)
            res.send(resultadoJson);
            //res.json({usuario, "token" : token, "statusCode" : 200});
        }

    });
});


module.exports = path;