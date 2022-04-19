const express = require('express');
const bcrypt = require('bcryptjs');

const multer = require('multer');
const mongodb = require('mongodb');

const ObjectId = mongodb.ObjectId;

const db = require('../data/database');

const router = express.Router();

currentuser = ''
idreserva=''
idservicio= ''
idretiro=''
identrega=''
vehiculo=''


router.get('/signup', function (req, res) {
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      nombre: '',
      apellido: '',
      email: '',
      confirmEmail: '',
      telefono: '',
      password: '',
    };
  }

  req.session.inputData = null;

  res.render('signup', { inputData: sessionInputData });
});

router.get('/login', function (req, res) {
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      email: '',
      password: '',
    };
  }

  req.session.inputData = null;
  res.render('login', { inputData: sessionInputData });
});

router.post('/signup', async function (req, res) {
  const userData = req.body;
  const nombreRegistrado = userData.nombre;
  const apellidoRegistrado = userData.apellido;
  const enteredEmail = userData.email; // userData['email']
  const enteredConfirmEmail = userData['confirm-email'];
  const enteredTelephone = userData.telefono;
  const enteredPassword = userData.password;

  if (
    !nombreRegistrado ||
    !apellidoRegistrado ||
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredTelephone ||
    !enteredPassword ||
    enteredPassword.trim().length < 6 ||
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes('@')
  ) {
    req.session.inputData = {
      hasError: true,
      message: 'Por favor verifique sus datos',
      nombre: nombreRegistrado,
      apellido: apellidoRegistrado,
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      telefono: enteredTelephone,
      password: enteredPassword,
    };

    req.session.save(function () {
      res.redirect('/signup');
    });
    return;
    // return res.render('signup');
  }

  const existingUser = await db
    .getDb()
    .collection('users')
    .findOne({ email: enteredEmail });

  if (existingUser) {
    req.session.inputData = {
      hasError: true,
      message: 'El usuario ya existe!',
      nombre: nombreRegistrado,
      apellido: apellidoRegistrado,
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      telefono: enteredTelephone,
      password: enteredPassword,
      admin: false
    };
    req.session.save(function () {
      res.redirect('/signup');
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(enteredPassword, 12);

  const user = {
    nombre: nombreRegistrado,
    apellido: apellidoRegistrado,
    email: enteredEmail,
    telefono: enteredTelephone,
    password: hashedPassword,
  };

  await db.getDb().collection('users').insertOne(user);

  res.redirect('/login');
});

router.post('/login', async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;

  const existingUser = await db
    .getDb()
    .collection('users')
    .findOne({ email: enteredEmail });

  if (!existingUser) {
    req.session.inputData = {
      hasError: true,
      message: 'No se pudo iniciar sesión. ¡Verifique sus datos! ',
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      res.redirect('/login');
    });
    return;
  }

  const passwordsAreEqual = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  );

  if (!passwordsAreEqual) {
    req.session.inputData = {
      hasError: true,
      message: 'No se pudo iniciar sesión. ¡Verifique sus datos! ',
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      res.redirect('/login');
    });
    return;
  }

  req.session.user = { id: existingUser._id, email: existingUser.email };
  currentuser = existingUser
  req.session.isAuthenticated = true;
  req.session.save(function () {
    res.redirect('/main');
  });
});

router.get('/admin', async function (req, res) {
  if (!res.locals.isAuth) {
    // if (!req.session.user)
    return res.status(401).render('401');
  }

  if (!res.locals.isAdmin) {
    return res.status(403).render('403');
  }

  res.render('admin');
});

router.get('/', async function (req, res) {

  const servicios = await db.getDb().collection('servicios').find().toArray();      //nuevo

  res.render('landing', { servicios: servicios });                              //nuevo

});

router.get('/main', async function (req, res) {
  if (!res.locals.isAuth) {
    // if (!req.session.user)
    return res.status(401).render('401');
  }

  const vehiculos = await db.getDb().collection('vehiculos').find().toArray();
  const servicios = await db.getDb().collection('servicios').find().toArray();
  const user = currentuser
  res.render('index', { vehiculos: vehiculos, user: user, servicios: servicios });
});

router.post('/logout', function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  currentuser = ''
  res.redirect('/');
});


//************************************************* Vehiculos  ***********************************************


const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images');                       //The second parameter is the location (folder) for the images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
})

const upload = multer({ storage: storageConfig })


router.get('/vehiculos', async function (req, res) {
  const vehiculos = await db.getDb().collection('vehiculos').find().toArray();
  const user = currentuser
  res.render('vehiculos', { vehiculos: vehiculos, user: user });
});

router.get('/nuevo-vehiculo', function (req, res) {
  res.render('nuevo-vehiculo');
});

//Crear un nuevo vehiculo
router.post('/vehiculos', upload.single('image'), async function (req, res) {
  const uploadedImageFile = req.file;

  await db.getDb().collection('vehiculos').insertOne({
    marca: req.body.marca,
    model: req.body.modelo,
    precio: req.body.precio,
    tipo: req.body.tipo,
    pasajeros: req.body.pasajeros,
    unidades: req.body.unidades,
    sucursal: req.body.sucursal,
    imagePath: uploadedImageFile.path
  })

  console.log(uploadedImageFile);

  res.redirect('/vehiculos')
});

//Eliminar un vehiculo

router.post('/vehiculos/:id/delete', async function (req, res) {
  const vehiculoId = new ObjectId(req.params.id);
  const result = await db.getDb().collection('vehiculos').deleteOne({ _id: vehiculoId })

  res.redirect('/vehiculos');
})

//editar informacion de vehiculos

router.get("/vehiculos/:id/edit", async function (req, res) {
  const vehiculoId = req.params.id;
  const vehiculo = await db.getDb().collection('vehiculos').findOne({ _id: new ObjectId(vehiculoId) }, { marca: 1, model: 1, precio: 1, tipo: 1, pasajeros: 1, unidades: 1, sucursal: 1, imagePath: 1 });
  const user = currentuser

  res.render('vehiculo-editar', { vehiculo: vehiculo, user: user })
});


router.post('/vehiculos/:id/edit', upload.single('image'), async function (req, res) {
  const vehiculoId = new ObjectId(req.params.id);
  const uploadedImageFile = req.file;
  const result = await db.getDb().collection('vehiculos').updateOne({ _id: vehiculoId }, {
    $set: {
      marca: req.body.marca,
      model: req.body.modelo,
      precio: req.body.precio,
      tipo: req.body.tipo,
      pasajeros: req.body.pasajeros,
      unidades: req.body.unidades,
      sucursal: req.body.sucursal,
      imagePath: uploadedImageFile.path
    }
  });

  res.redirect('/vehiculos');
});


//Ver detalle de cada vehiculo

router.get('/vehiculos/:id', async function (req, res, next) {
  const vehiculoId = new ObjectId(req.params.id)


  const vehiculo = await db.getDb().collection('vehiculos').findOne({ _id: vehiculoId }, { summary: 0 });
  const user = currentuser

  res.render('vehiculo-detalle', { vehiculo: vehiculo, user: user })
});


//********************** Sucursales *******************************/


//Vista general de todas las sucursales

router.get('/sucursales', async function (req, res) {
  const sucursales = await db.getDb().collection('sucursales').find().toArray();
  const user = currentuser
  res.render('sucursales', { sucursales: sucursales, user: user });
});


//Ver detalle de cada sucursal

router.get('/sucursales/:id', async function (req, res, next) {
  const sucursalId = new ObjectId(req.params.id)

  const user = currentuser
  const sucursal = await db.getDb().collection('sucursales').findOne({ _id: sucursalId }, { summary: 0 });

  res.render('sucursal-detalle', { sucursal: sucursal, user: user })
});


router.get('/controlusers', function (req, res) {
  if (!currentuser.admin) {
    res.redirect('/main')
  }
  else {
    res.render('controlusers');
  }
});

router.post('/controlusers', async function (req, res) {
  if (!currentuser.admin) {
    res.redirect('/main')
  }
  else {
    usuario = req.body.email;
    rol = req.body.rol

    if (rol == 'admin') {
      const user = await db
        .getDb()
        .collection('users')
        .updateOne({ email: usuario }, { $set: { admin: true } })
    }
    else {
      const user = await db
        .getDb()
        .collection('users')
        .updateOne({ email: usuario }, { $set: { admin: false } })
    }
    //await db.getDb().collection('users').();
    res.redirect('/main');
  }

});





//********************** Usuarios *******************************/
//Vista general de todas los usuario

router.get('/userProfile', async function (req, res) {
  const usuarios = await db.getDb().collection('users').find().toArray();
  res.render('userProfile', { usuarios: usuarios });
});

//Ver perfil de un usuario
router.get('/userProfile/:id', async function (req, res) {
  const UsuarioId = new ObjectId(req.params.id)
  const usuario = await db.getDb().collection('users').findOne({ _id: UsuarioId }, { summary: 0 });

  res.render('profile', { usuario: usuario });
});

//editar informacion de usuarios
router.get("/profile/:id/edit", async function (req, res) {
  const UsuarioId = req.params.id;
  const usuario = await db.getDb().collection('users').findOne({ _id: new ObjectId(UsuarioId) }, { nombre: 1, apellido: 1, email: 1, telefono: 1, password: 1 });


  res.render('profile-editar', { usuario: usuario })
});


router.post('/profile/:id/edit', upload.single('image'), async function (req, res) {
  const usuarioId = new ObjectId(req.params.id);
  const uploadedImageFile = req.file;
  const result = await db.getDb().collection('users').updateOne({ _id: usuarioId }, {
    $set: {
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      telefono: req.body.telefono,
      //password: req.body.password,      
      imagePath: uploadedImageFile.path
    }
  });

  res.redirect('/userProfile/' + String(usuarioId));
});

//********************** Servicios *******************************/
//Ver detalle de cada servicio

router.get('/servicios/:id', async function (req, res, next) {
  const servicioId = new ObjectId(req.params.id)


  const servicio = await db.getDb().collection('servicios').findOne({ _id: servicioId }, { summary: 0 });
  const user= currentuser
  res.render('servicio-detalle', { servicio: servicio, user: user })
});

//*********************** Reservas  ****************************/
//ver formulario de reservaciones de vehiculo

router.get('/vehiculos/:id/reserva', async function (req, res, next) {
  vehiculo = new ObjectId(req.params.id)
  const vehiculos = await db.getDb().collection('vehiculos').findOne({ _id: vehiculo }, { summary: 0 });
  const sucursales = await db.getDb().collection('sucursales').find().toArray();
  const servicios = await db.getDb().collection('servicios').find().toArray();
  const user= currentuser

  res.render('vehiculo-reserva', { vehiculo: vehiculos, servicios: servicios, sucursales: sucursales, user: user  })
});

//Ver reservacion
router.get('/reserva', async function (req, res) {
  const user = currentuser
  const reservas = idreserva
  console.log(idreserva)
  const vehiculo = await db.getDb().collection('vehiculos').findOne({_id: reservas.vehiculo});
  const servicio= await db.getDb().collection('servicios').findOne({_id:reservas.servicio});
  const retiro= await db.getDb().collection('sucursales').findOne({_id:reservas.lugarRetiro});
  const entrega= await db.getDb().collection('sucursales').findOne({_id:reservas.lugarEntrega});
  res.render('reserva', { reserva: reservas , vehiculo:vehiculo,retiro:retiro, entrega:entrega, servicio:servicio, user:user})
})

//Crear reservacion de vehiculo
router.post('/vehiculos/:id/reserva', async function (req, res) {
  const user= currentuser
  const vehiculoId = vehiculo;

  const retiroId = new ObjectId(req.body.lugarRetiro);
  //const retiro= await db.getDb().collection('sucursales').findOne({ _id: retiroId });
  const entregaId = new ObjectId(req.body.lugarEntrega);
  const servicioId = new ObjectId(req.body.servicio);
  fecha= new Date()
  //d1=new Date(req.body.fechaRetiro + ' '+ req.body.horaRetiro)
  //d2=new Date(req.body.fechaEntrega + ' '+ req.body.horaEntrega)

  d1=new Date(req.body.fechaRetiro)
  d2=new Date(req.body.fechaEntrega)

  //h1=new Date(req.body.horaRetiro)
  //h2=new Date(req.body.horaEntrega)
  //dia1=d1.getTime()-d2.getTime()
  const tiempo= (d2.getTime()-d1.getTime())/(24*60*60)/1000 +1;
  const S= (await db.getDb().collection('servicios').findOne({_id:servicioId}));
  const V= (await db.getDb().collection('vehiculos').findOne({_id:vehiculoId}));
  const costoS=S.costo
  const costoV=V.precio
  const subtotal= (tiempo*costoS)+(tiempo*costoV)
 // const servicio = await db.getDb().collection('servicios').findOne({ nombre: servicioId });
  const nuevaReserva = {
    fechareserva: fecha.getFullYear()+"-"+(parseInt(fecha.getMonth())+1)+"-"+fecha.getDate(),
    fechaRetiro: req.body.fechaRetiro,
    horaRetiro: req.body.horaRetiro,
    fechaEntrega: req.body.fechaEntrega,
    horaEntrega: req.body.horaEntrega,
    usuario: user._id,
    vehiculo: vehiculoId,
      //marca: vehiculo.marca,
      //model: vehiculo.model
    lugarRetiro: retiroId,
      //ciudad: sucursal.ciudad,
    lugarEntrega: entregaId,
      //ciudad: sucursal.ciudad
    servicio: servicioId,
      //nombre: servicio.nombre,
      //costo: servicio.costo
    tiempoReserva: tiempo,
    subtotal: subtotal,
    isv: subtotal*0.15,
    total: subtotal+(subtotal*0.15),
    estado: 'En proceso'
  };

  const result = await db.getDb().collection('reservas').insertOne(nuevaReserva);
  idreserva= await db.getDb().collection('reservas').findOne({_id: nuevaReserva._id});
  console.log(result);
  res.redirect('/reserva')
}
);

//------Historial de rerservas

router.get('/historial', async function (req, res) {
  const user = currentuser
  const reservas = await db.getDb().collection('reservas').find({usuario:user._id}).toArray();
  //console.log(reservas)
  const Arr=[]
  veh='', retiro='', entrega='';
  for (i in reservas){
      vehic = await db.getDb().collection('vehiculos').findOne({_id:reservas[i].vehiculo})
      lugarre= await db.getDb().collection('sucursales').findOne({_id:reservas[i].lugarRetiro})
      //console.log(reservas[i])
      //console.log(lugarre)
      lugaren= await db.getDb().collection('sucursales').findOne({_id:reservas[i].lugarEntrega}) 
      //fechaReser= await db.getDb().collection('reservas').findOne({_id:reservas[i].fechareserva})     
      if (vehic._id=reservas[i].vehiculo){
        veh=(vehic.marca + " " + vehic.model);
      }
      if (lugarre._id=reservas[i].lugarRetiro){
        retiro=(lugarre.ciudad); 
      }
      if (lugaren._id=reservas[i].lugarEntrega){
        entrega=(lugaren.ciudad); 
      }
    Arr.push({
      '_id': reservas[i]._id,
      'fecha': reservas[i].fechareserva,
      'vehiculo': veh,
      'retiro':retiro,
      'entrega':entrega,
      'estado': reservas[i].estado
    })
    }
    //console.log(Arr)
  res.render('historial', { reservas:Arr, user:user})
})

router.get('/historial-detalle/:id', async function (req, res) {
  const ReservaId = new ObjectId(req.params.id)
  const user = currentuser
  const reservas = await db.getDb().collection('reservas').findOne({_id:ReservaId});
  const vehiculo = await db.getDb().collection('vehiculos').findOne({_id: reservas.vehiculo});
  const retiro= await db.getDb().collection('sucursales').findOne({_id:reservas.lugarRetiro});
  const entrega= await db.getDb().collection('sucursales').findOne({_id:reservas.lugarEntrega});
  
  //console.log(entrega)
  res.render('historial-detalle', { reserva: reservas,retiro: retiro,entrega:entrega,vehiculo:vehiculo, user:user})
})

//Cancelar reservacion

router.post('/reserva/:id/delete', async function(req, res){
  const reservaId = new ObjectId(req.params.id);
  const user = currentuser
  const result = await db.getDb().collection('reservas').deleteOne({_id: reservaId})

  res.redirect('/vehiculos');
})

//************* Facturas ***********/
router.post('/procesar-reserva/:id', async function (req, res) {  
  const reservaId = new ObjectId(req.params.id)
  const reservaData = await db.getDb().collection('reservas').findOne({_id:reservaId});
  const cliente = await db.getDb().collection('users').findOne({_id:reservaData.usuario});
  const agenciaRetiro = await db.getDb().collection('sucursales').findOne({_id:reservaData.lugarRetiro});
  const agenciaEntrega = await db.getDb().collection('sucursales').findOne({_id:reservaData.lugarEntrega});
  const vehiculo = await db.getDb().collection('vehiculos').findOne({_id:reservaData.vehiculo});  
  const servicio = await db.getDb().collection('servicios').findOne({_id:reservaData.servicio});  

  const factura = {
    noReserva : reservaId,
    fechaReserva : reservaData.fechareserva,
    fechaRetiro : reservaData.fechaRetiro,    
    fechaEntrega : reservaData.fechaEntrega,
    lugarRetiro: agenciaRetiro.ciudad,
    lugarEntrega: agenciaEntrega.ciudad,
    cliente : cliente.nombre + " " +cliente.apellido,
    agencia : agenciaRetiro.ciudad,
    vehiculo: vehiculo.marca +" "+vehiculo.model,
    costo : vehiculo.precio,
    servicio : servicio.nombre,
    costoServicio : parseInt(servicio.costo)*parseInt(reservaData.tiempoReserva),
    dias : reservaData.tiempoReserva,
    subTotal: reservaData.subtotal,
    isv: reservaData.isv,
    total: reservaData.total
  };

  await db.getDb().collection('facturas').insertOne(factura);
  await db.getDb().collection('reservas').updateOne({_id:reservaId},{$set:{"estado":"Pagado"}});

  res.redirect('/historial');
});

router.get('/facturar/:id', async function (req, res) {
  const facturaId = new ObjectId(req.params.id)
  console.log(facturaId)
  const factura = await db.getDb().collection('facturas').findOne({ "noReserva": facturaId }, { summary: 0 });
  console.log(factura)

  res.render('factura', { factura: factura });
});

module.exports = router;
