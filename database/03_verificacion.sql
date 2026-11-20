-- Nombre: Oscar Armando Medina Gutiérrez
-- Materia: Verificación y Validación de Software
-- Programa: 03_verificacion.sql
-- Descripción: Verificar esquema, catálogo e integridad.
-- Requerimiento: RF03, RF04, RF05, RF07, RF13, RF17
-- Fecha: 19 de noviembre de 2026
USE DulceHogar;
GO
SELECT name FROM sys.tables ORDER BY name;
SELECT * FROM dbo.Roles;
SELECT * FROM dbo.EstadosPedido;
SELECT * FROM dbo.vwCatalogo ORDER BY idProducto;
SELECT * FROM dbo.vwCatalogo WHERE stock = 0;
SELECT p.nombre,p.stock, COALESCE(SUM(m.cambio),0) AS saldo
FROM dbo.Productos p LEFT JOIN dbo.MovimientosInventario m
ON m.idProducto=p.idProducto GROUP BY p.nombre,p.stock;
GO
-- Prueba negativa: stock inválido. No modifica datos.
BEGIN TRY
  BEGIN TRANSACTION;
  UPDATE dbo.Productos SET stock=-1 WHERE idProducto=(SELECT MIN(idProducto) FROM dbo.Productos);
  ROLLBACK;
  SELECT N'FALLO: se aceptó stock negativo' AS resultado;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  SELECT ERROR_NUMBER() AS codigo, ERROR_MESSAGE() AS mensaje;
END CATCH;
GO
-- Prueba negativa: categoría inexistente.
BEGIN TRY
  BEGIN TRANSACTION;
  INSERT dbo.Productos(idCategoria,nombre,descripcion,precio,stock)
  VALUES(-1,N'Prueba',N'Prueba',10,1);
  ROLLBACK;
  SELECT N'FALLO: se aceptó categoría inexistente' AS resultado;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  SELECT ERROR_NUMBER() AS codigo, ERROR_MESSAGE() AS mensaje;
END CATCH;
GO
-- Prueba temporal de relaciones, precio histórico y total.
-- El valor de contraseña es un marcador no autenticable, nunca persiste.
BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @usuario INT, @carrito INT, @pedido INT, @producto INT;
  SELECT @producto=MIN(idProducto) FROM dbo.Productos WHERE stock>=2;
  INSERT dbo.Usuarios(idRol,nombre,correo,contrasenaHash)
  SELECT idRol,N'Prueba temporal',N'prueba-j7@example.invalid',N'NO_AUTENTICABLE'
  FROM dbo.Roles WHERE nombre=N'Cliente';
  SET @usuario=CONVERT(INT,SCOPE_IDENTITY());
  INSERT dbo.Carritos(idUsuario) VALUES(@usuario);
  SET @carrito=CONVERT(INT,SCOPE_IDENTITY());
  INSERT dbo.DetalleCarrito VALUES(@carrito,@producto,2);
  INSERT dbo.Pedidos(idUsuario,idEstado) VALUES(@usuario,1);
  SET @pedido=CONVERT(INT,SCOPE_IDENTITY());
  INSERT dbo.DetallePedido(idPedido,idProducto,nombreProducto,cantidad,precioUnitario)
  SELECT @pedido,idProducto,nombre,2,precio FROM dbo.Productos WHERE idProducto=@producto;
  UPDATE dbo.Productos SET stock=stock-2 WHERE idProducto=@producto;
  INSERT dbo.MovimientosInventario(idProducto,idUsuario,idPedido,cambio,motivo)
  VALUES(@producto,@usuario,@pedido,-2,N'Prueba de venta');
  DELETE dbo.DetalleCarrito WHERE idCarrito=@carrito;
  SELECT * FROM dbo.vwTotalesPedido WHERE idPedido=@pedido;
  SELECT stock FROM dbo.Productos WHERE idProducto=@producto;
  UPDATE dbo.Productos SET precio=precio+10 WHERE idProducto=@producto;
  SELECT * FROM dbo.vwTotalesPedido WHERE idPedido=@pedido;
  ROLLBACK;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  THROW;
END CATCH;
GO
SELECT COUNT(*) AS usuariosPersistentes FROM dbo.Usuarios;
SELECT COUNT(*) AS pedidosPersistentes FROM dbo.Pedidos;