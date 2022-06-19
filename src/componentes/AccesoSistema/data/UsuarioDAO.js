const {Usuario} = require('../modelo/Usuario')
var mysqlConnection = require('../../../../utils/conexion');
var mensajes = require('../../../../utils/mensajes');

exports.UsuarioDAO = class UsuarioDAO {
    static iniciarSesion(usuario, password, callback) {
        var query = 'SELECT * FROM perfil_usuario WHERE nombre_usuario = ? AND clave = ?';

        mysqlConnection.query(query, [usuario, password], (error, resultadoInicio) => {
            if(error) {
                callback(500, mensajes.errorInterno);
            } else if(resultadoInicio.length == 0){
                console.log("¡Credenciales incorrectas! Probablemente el usuario no exista o estan mal sus credenciales");
                callback(404, mensajes.peticionNoEncontrada);
            } else {
                console.log("¡Inicio de sesión exitosa!");
                var usuario = resultadoInicio[0];
                var arrayFotografia = null
                if (usuario.fotografia == null){
                    console.log('Fotografia vacia, se procede a poner null');
                }else{
                    arrayFotografia = Uint8ClampedArray.from(Buffer.from(usuario.fotografia.buffer, 'base64'))
                }

                var usuarioConectado = new Usuario();
                usuarioConectado.clave = usuario['clave'];
                usuarioConectado.estatus = usuario['estatus'];
                usuarioConectado.idPerfilUsuario = usuario['id_perfil_usuario'];
                usuarioConectado.correoElectronico = usuario['correo_electronico'];
                usuarioConectado.fotografia = arrayFotografia;
                usuarioConectado.nombre = usuario['nombre_usuario'];
                usuarioConectado.tipoUsuario = usuario['tipo_usuario'];

                callback(200, usuarioConectado);
            }
        });
    }

    static restablecerContraseña(correoElectronico, callback) {
        callback(null,{});
    }

    static cerrarSesion(idUsuario, callback) {

        callback(null, {});
    }

    static habilitarPerfil(idUsuario, callback) {
        var query = 'UPDATE perfil_usuario SET estatus = 1 WHERE id_perfil_usuario = ?;'

        mysqlConnection.query(query, [ idUsuario], (error, resultadoHabilitar) => {
            if(error){
                //consoleError(error, 'Funcion: Habilitar perfil. Paso: error al habilitar perfil')
                callback(500, mensajes.errorInterno);
            }else if(resultadoHabilitar.changedRows == 1){//Se modifico el registro de usuario
                const idPerfilHabilitado = {}

                idPerfilHabilitado = {
                    "idPerfilusuario" : idPerfilUsuario,
                    "estatus" : 1
                };
                callback(200, idPerfilHabilitado);
            }else{
                callback(404, mensajes.peticionNoEncontrada);
            }
        })
    }

    static deshabilitarPerfil(idUsuario, funcionRespuesta) {
        
    }
}