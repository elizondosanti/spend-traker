/**
 * Real BAC email layouts (Nov 2026), with cardholder names anonymized.
 * Fixture emails for parser/ingest tests (not shown in production UI).
 */
export type SampleEmail = { id: string; label: string; from: string; subject: string; text: string };

export const SAMPLE_EMAILS: SampleEmail[] = [
  {
    id: "dunkin",
    label: "Compra AMEX · Dunkin Mall San Pedro · ₡10.300",
    from: "Notificación BAC <notificacion@baccredomatic.com>",
    subject: "Notificación de transacción DUNKIN MALL SAN PEDRO 30-10-2026 - 12:13",
    text: `Notificación de transacción DUNKIN MALL SAN PEDRO 30-10-2026 - 12:13
Hola CLIENTE BAC
A continuación le detallamos la transacción realizada:
Comercio: DUNKIN MALL SAN PEDRO
Ciudad y país: , Costa Rica
Fecha: Oct 30, 2026, 12:13
AMEX: ***********4743
Autorización: 361611
Referencia:
Tipo de Transacción: COMPRA
Monto: CRC 10,300.00`,
  },
  {
    id: "parquimetros",
    label: "Compra MASTER · MSJ Parquímetros · ₡960",
    from: "Notificación BAC <notificacion@baccredomatic.com>",
    subject: "Notificación de transacción MSJ PARQUIMETROS 23-10-2026 - 21:41",
    text: `Notificación de transacción MSJ PARQUIMETROS 23-10-2026 - 21:41
Hola CLIENTE BAC
A continuación le detallamos la transacción realizada:
Comercio: MSJ PARQUIMETROS
Ciudad y país: SanJose, Costa Rica
Fecha: Oct 23, 2026, 21:41
MASTER: ************3771
Autorización: 238128
Referencia: 629603238128
Tipo de Transacción: COMPRA
Monto: CRC 960.00`,
  },
  {
    id: "oso-perezoso",
    label: "Compra MASTER · El Oso Perezoso Puntarenas · ₡18.450",
    from: "Notificación BAC <notificacion@baccredomatic.com>",
    subject: "Notificación de transacción EL OSO PEREZOSO PUNTARENAS 01-11-2026 - 13:05",
    text: `Notificación de transacción EL OSO PEREZOSO PUNTARENAS 01-11-2026 - 13:05
Hola CLIENTE BAC
A continuación le detallamos la transacción realizada:
Comercio: EL OSO PEREZOSO PUNTARENAS
Ciudad y país: Puntarenas, Costa Rica
Fecha: Nov 1, 2026, 13:05
MASTER: ************3771
Autorización: 551902
Referencia: 630501551902
Tipo de Transacción: COMPRA
Monto: CRC 18,450.00`,
  },
  {
    id: "sinpe-sin-descripcion",
    label: "SINPE recibido · Sin descripción · ₡3",
    from: "alerta@baccredomatic.com",
    subject: "Notificación de Transferencia Local",
    text: `Notificación de Transferencia Local
Estimado(a) CLIENTE BAC :
BAC Credomatic le comunica que ANA MORA SOLANO realizó una transferencia electrónica a su cuenta N° *****3613.
La transferencia se realizó el día 03-11-2026 a las 09:55:13 horas; por un monto de 3,00 CRC , por concepto de:
Sin Descripcion
El número de referencia es 2026110310283002634402830
Muchas Gracias.`,
  },
  {
    id: "sinpe-alimentacion",
    label: "SINPE recibido · Categoria_alimentacion · ₡3",
    from: "alerta@baccredomatic.com",
    subject: "Notificación de Transferencia Local",
    text: `Notificación de Transferencia Local
Estimado(a) CLIENTE BAC :
BAC Credomatic le comunica que ANA MORA SOLANO realizó una transferencia electrónica a su cuenta N° *****3613.
La transferencia se realizó el día 03-11-2026 a las 09:57:13 horas; por un monto de 3,00 CRC , por concepto de:
Categoria_alimentacion
El número de referencia es 2026110310283002634416714
Muchas Gracias.`,
  },
  {
    id: "sinpe-horas",
    label: "SINPE recibido · Horas trabajo Fede · ₡92.250",
    from: "alerta@baccredomatic.com",
    subject: "Notificación de Transferencia Local",
    text: `Notificación de Transferencia Local
Estimado(a) CLIENTE BAC :
BAC Credomatic le comunica que DEPOSITO DE MADERAS SEBASELI S realizó una transferencia electrónica a su cuenta N° *****7711.
La transferencia se realizó el día 07-10-2024 a las 12:20:13 horas; por un monto de 92.250,00 CRC , por concepto de:
Horas trabajo Fede
El número de referencia es 406407783
Muchas Gracias.`,
  },
  {
    id: "municipalidad",
    label: "Pago de servicio · Municipalidad de Tibás · ₡197.346,87",
    from: "comprobante_cri@baccredomatic.com",
    subject: "Comprobante de Pago de Servicios",
    text: `Comprobante de Pago de Servicios
Estimado(a) Cliente:
Se ha realizado un pago de servicio de Municipalidad de Tibás desde Banca Móvil.
A continuación le adjuntamos el comprobante de pago:
Alias: Servicio municipales locales Tibas
Descripción: 3101276796_1
Número Referencia: 3101276796
Tipo Convenio: 1
Fecha de Pago: 2024-06-05 12:45:36.744
Número de Autorización: 951442814
Forma de Pago: ****************8593
Monto: 197,346.87 CRC
Fecha Vencimiento: 20240605
Por favor verifique su transacción en el histórico transaccional de nuestra Banca en Línea.
Muchas Gracias.`,
  },
];
