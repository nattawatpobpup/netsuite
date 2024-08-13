/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * Print Bill
 * **************************************************************************
 * Date : 30-04-2022
 *
 * Author: SP
 * Script Description : Print Bill
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-04-2022} SP : created
 ******************************************************************************/
define(['N/file', 'N/render', 'N/record', 'N/search', 'N/config','N/runtime', 'N/xml'], function (file, render, record, search, config,runtime,mxml) {
  var TEMPLATE = './bill.xml';
  function onRequest(context) {
    try {
      var renderer = render.create();
      var jvRecord = record.load({ type: 'invoicegroup', id: context.request.parameters.recId });

      var userName = getCreatedPerson(context.request.parameters.recId);

      renderer.templateContent = file.load(TEMPLATE).getContents();

      var totalamount = jvRecord.getValue('fxamountdue');

      var totalWord = BAHTTEXT(totalamount);

      var companyInfo = config.load({
        type: config.Type.COMPANY_INFORMATION,
      });

      var logoFile = companyInfo.getValue('formlogo');
      var fileObj = file.load({
        id: logoFile,
      });

      
      var compName = companyInfo.getValue('legalname');
      var vatno = companyInfo.getValue('employerid');

      var addrRec = companyInfo.getSubrecord('mainaddress');
      var comAddress1 = addrRec.getValue('addr1');
      var comAddress2 = addrRec.getValue('addr2');
      var comAddress3 = addrRec.getValue('addr3');
      var comCity = addrRec.getValue('city');
      var comState = addrRec.getValue('state');
      var comzip = addrRec.getValue('zip');
      var tel = addrRec.getValue('addrphone');
      var fax = companyInfo.getValue('fax');

      var comAddress1 = comAddress1 + ' ' + comAddress2 + ' ' + comAddress3;
      var comAddress2 = comCity + ' ' + comState + ' ' + comzip;

      var comAddress = comAddress1 + ' ' + comAddress2;

      companyInfo = {
        companyname: compName,
        companyaddress: wordWrap(comAddress,60),
        tel: tel,
        fax: fax, 
        vatno: vatno,
      };

      log.debug('companyInfo', companyInfo);

      log.debug('companyInfo', companyInfo);

      var customerId = jvRecord.getValue('customer');

      // log.debug("customerId", customerId);
      var custData = search.lookupFields({
        type: 'customer',
        id: customerId,
        columns: ['phone', 'fax', 'entityid', 'companyname','vatregnumber'],
      });
      var custPhone = '';
      var custFax = '';
      if (!isEmptyObj(custData)) {
        custPhone = custData.phone;
        custFax = custData.fax;
        var custid = custData.entityid;
        var custname = custData.companyname;
        var taxid = custData.vatregnumber;
      }
      // custid = custid.substring(0, custid.indexOf(' '));
      // log.debug("id", custData.entityid);

      //context.response.writeFile(renderer.renderAsPdf(),true);
      var custg = jvRecord.getText('csegskr_cust_group');
      if (!isEmpty(custg)) {
        custg = custg.substr(0, custg.indexOf(' '));
      }

      renderer.addRecord({ templateName: 'record', record: jvRecord });

      var internalIdArr = [];
      internalIdArr.push(context.request.parameters.recId);
      var glLines = getGlImpact(internalIdArr);

      var invoicegroupSearchObj = search.create({
        type: 'invoicegroup',
        filters: [
          ['transaction.accounttype', 'noneof', '@NONE@'],
          'AND',
          ['transaction.amount', 'notequalto', '0.00'],
          'AND',
          ['transaction.mainline', 'is', 'T'],
          'AND',
          ['transaction.taxline', 'is', 'F'],
          'AND',
          ['internalid', 'anyof', context.request.parameters.recId],
        ],
        columns: [
          search.createColumn({
            name: 'internalid',
            summary: 'COUNT',
            sort: search.Sort.ASC,
            label: 'Internal ID',
          }),
          search.createColumn({
            name: 'tranid',
            join: 'transaction',
            summary: 'COUNT',
            label: 'Document Number',
          }),
        ],
      });

      var lineArr = [];
      invoicegroupSearchObj.run().each(function (result) {
        var countinv2 = result.getValue(invoicegroupSearchObj.columns[1]);

        line = {
          // countinv2 : countinv2
          countinv2: glLines.accgl.length,
        };

        lineArr.push(line);
        return true;
      });

      var billaddress = jvRecord.getValue('billaddress');

      if (billaddress.indexOf(custname) > -1) {
        billaddress = billaddress.split(custname).join('');
      }
      billaddress = escape_for_xml(billaddress);
      billaddress = wordWrap(billaddress, 150);

      var invoicegroupSearchObj = search.create({
        type: "invoicegroup",
        filters:
        [
           ["internalid","anyof","1"]
        ],
        columns:
        [
           search.createColumn({name: "itemtotal", label: "Item Total"})
        ]
     });
      var total;
      invoicegroupSearchObj.run().each(function (result) {
        // for (var i = 0; i < searchColumns.length; i++) itemLine[searchColumns[i].label] = result.getValue(searchColumns[i]);
        total = result.getValue(invoicegroupSearchObj.columns[0]);
        return true;
      });
      var arrNumber = Math.abs(total).toString().split('.');
      var numberWords = numberToEnglish(arrNumber);
      if (arrNumber.length > 1) {
        if (parseInt(arrNumber[1]) > 0) {
          numberWords = numberWords + ' and ' + parseInt(arrNumber[1]).toString() + '/100';
        }
      }
      var totaleng = numberWords;
      var appName = getApprovedPerson(context.request.parameters.recId);


      var data = {
        glLines: glLines.accgl,
        appName:appName,
        taxid:taxid,
        custg: custg,
        logoUrl: escape_for_xml(fileObj.url),
        userName: removeDuplicates(userName),
        amtduetotal: glLines.amtduetotal,
        amounttotal: glLines.amounttotal,
        custFax: custFax,
        custPhone: custPhone,
        custid: custid,
        lineArr: lineArr,
        custname: custname,
        billAddress: billaddress,
        total:total,
        totaleng: totaleng,
        copytext: 'ต้นฉบับ',
        copytexteng: 'Original',
      };
      log.debug('data', data);

      //renderer.addRecord({templateName:'record',record: jvRecord});

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'data',
        data: data,
      });

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'company',
        data: companyInfo,
      });

      arrFileId = [];
      var foldderId = getScriptFolder(runtime.getCurrentScript().id);
      var filePdf = renderer.renderAsPdf();
      filePdf.name = context.request.parameters.recId + '.pdf';
      filePdf.folder = foldderId;
      filePdf.isOnline = true;
      var fileId = filePdf.save();
      arrFileId.push(fileId);

      data.copytext = 'สำเนา';
      data.copytexteng = 'COPY';
      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'data',
        data: data,
      });

      var filePdf2 = renderer.renderAsPdf();
      filePdf2.name = context.request.parameters.recId + '_2.pdf';
      filePdf2.folder = foldderId;
      filePdf2.isOnline = true;
      var fileId2 = filePdf2.save();
      arrFileId.push(fileId2);
      context.response.writeFile(generateXml(arrFileId), true);
      file.delete({
        id: fileId,
      });
      file.delete({
        id: fileId2,
      });

    } catch (err) {
      log.debug('error@onRequest', err + ' line ' + err.lineNumber);
    }
  }

  function getApprovedPerson(recordId) {
    var transactionSearchObj = search.create({
      type: 'invoicegroup',
      filters: [['internalid', 'anyof', recordId]],
      columns: [
        search.createColumn({
          name: "formulatext",
          formula: "{transaction.createdby}",
          label: "Formula (Text)",
        }),
      ],
    });

    var setby = '';
    transactionSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      setby = result.getValue(transactionSearchObj.columns[0]);
      return true;
    });
    
   var supervisor = ''
   setby = setby.substring(0, setby.indexOf(' '));
   var employeeSearchObj = search.create({
     type: "employee",
     filters:
     [
       ["entityid","haskeywords",setby]
      ],
      columns:
      [
        search.createColumn({name: "supervisor", label: "Supervisor"})
      ]
    });
    employeeSearchObj.run().each(function(result){
      // .run().each has a limit of 4,000 results
      supervisor = result.getText(employeeSearchObj.columns[0]);
      return true;
    });
    // log.debug("setby + supervisor", setby + ' ' + supervisor)

   
   return supervisor;
  }

  function generateXml(arrFileId) {
    var tpl = ['<?xml version="1.0"?>', '<pdfset>'];

    arrFileId.map(function (id) {
      const partFile = file.load({ id: id });
      var pdf_fileURL = mxml.escape({ xmlText: partFile.url });
      //log.debug('pdf_fileURL',pdf_fileURL);
      tpl.push("<pdf src='" + pdf_fileURL + "'/>");
    });

    tpl.push('</pdfset>');

    //log.debug({title:'bound template', details:mxml.escape({xmlText:tpl.join('\n')})});

    return render.xmlToPdf({
      xmlString: tpl.join('\n'),
    });
  }

  function getGlImpact(invoiceId) {
    var invoicegroupSearchObj = search.create({
      type: 'invoicegroup',
      filters: [
        ['transaction.accounttype', 'noneof', '@NONE@'],
        'AND',
        ['transaction.amount', 'notequalto', '0.00'],
        'AND',
        ['transaction.mainline', 'is', 'T'],
        'AND',
        ['transaction.taxline', 'is', 'F'],
        'AND',
        ['internalid', 'anyof', invoiceId],
      ],
      columns: [
        search.createColumn({
          name: 'tranid',
          join: 'transaction',
          sort: search.Sort.ASC,
          label: 'no',
        }),
        search.createColumn({ name: 'trandate', label: 'date' }),
        search.createColumn({
          name: 'amount',
          join: 'transaction',
          label: 'Amount',
        }),
        search.createColumn({ name: 'fxamount', label: 'Amount (Foreign Currency)' }),
        search.createColumn({
          name: 'memo',
          join: 'transaction',
          label: 'memo',
        }),
        search.createColumn({
          name: 'itemtotal',
          join: 'transaction',
          label: 'Item Total',
        }),
        search.createColumn({
          name: 'duedate',
          join: 'transaction',
          label: 'Due Date/Receive By',
        }),
        search.createColumn({ name: 'invoicegroupnumber', label: 'Invoice Group #' }),
        search.createColumn({
          name: "custbody_ar_fulfill_carnum",
          join: "transaction",
          label: "ทะเบียนรถ"
       }),
        search.createColumn({ name: 'fxamountdue', label: 'Amount Due (Foreign Currency)' }),
      ],
    });

    var accgl = [];
    var amtdue;
    var amtduetotal;
    invoicegroupSearchObj.run().each(function (result) {
      var tranid = result.getValue(invoicegroupSearchObj.columns[0]);
      var Date = result.getValue(invoicegroupSearchObj.columns[1]);
      var amt = result.getValue(invoicegroupSearchObj.columns[2]);
      var foreignAmount = result.getValue(invoicegroupSearchObj.columns[3]);
      var Memo = result.getValue(invoicegroupSearchObj.columns[4]);
      var total = result.getValue(invoicegroupSearchObj.columns[5]);
      var duedate = result.getValue(invoicegroupSearchObj.columns[6]);
      var invNo = result.getValue(invoicegroupSearchObj.columns[7]);
      var carReg = result.getValue(invoicegroupSearchObj.columns[8]);
      amtdue = result.getValue(invoicegroupSearchObj.columns[9]);

      amtduetotal = BAHTTEXT(amtdue);
      amounttotal = amtdue * 1;

      accgl.push({
        tranid: tranid,
        Date: Date,
        Memo: Memo,
        amt: amt,
        total: total,
        duedate: duedate,
        invNo: invNo,
        carReg: carReg,
      });
      return true;
    });

    return { accgl: accgl, amtduetotal: amtduetotal, amounttotal: amounttotal };
  }

  //invoice group
  function getCreatedPerson(internalId) {
    var transactionSearchObj = search.create({
      type: 'invoicegroup',
      filters: [['internalid', 'anyof', internalId]],
      columns: [
        search.createColumn({
          name: 'formulatext',
          formula: '{transaction.createdby}',
          label: 'Formula (Text)',
        }),
      ],
    });

    var createName = '';
    transactionSearchObj.run().each(function (result) {
      createName = result.getValue(transactionSearchObj.columns[0]);
      return true;
    });

    return createName;
  }

  function getScriptFolder(scriptId) {
    var scriptSearchObj = search.create({
      type: 'script',
      filters: [['scriptid', 'is', scriptId]],
      columns: [search.createColumn({ name: 'scriptfile', label: 'Script File' })],
    });
    var fileId;
    scriptSearchObj.run().each(function (result) {
      fileId = result.getValue(scriptSearchObj.columns[0]);
      return true;
    });

    var folderId;
    if (!isEmpty(fileId)) {
      var fileObj = file.load({
        id: fileId,
      });
      if (!isEmptyObj(fileObj)) {
        folderId = fileObj.folder;
      }
    }

    return folderId;
  }

  function wordWrap(str, maxWidth) {
    var newLineStr = '<br/>';
    done = false;
    res = '';
    while (str.length > maxWidth) {
      found = false;
      for (i = maxWidth - 1; i >= 0; i--) {
        if (testWhite(str.charAt(i))) {
          res = res + [str.slice(0, i), newLineStr].join('');
          str = str.slice(i + 1);
          found = true;
          break;
        }
      }

      if (!found) {
        res += [str.slice(0, maxWidth), newLineStr].join('');
        str = str.slice(maxWidth);
      }
    }

    return res + str;
  }
  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
  }

  function removeDuplicates(str) {
    const arr = str.split(' ');
    const arr2 = [];

    arr.forEach(function (el) {
      if (arr2.indexOf(el) === -1) {
        arr2.push(el);
      }
    });

    return arr2.join(' ');
  }

  function escape_for_xml(argument) {
    try {
      if (argument != '' && argument != null) {
        argument = argument.replace(/&/g, '&amp;');
        argument = argument.replace(/</g, '&lt;');
        argument = argument.replace(/>/g, '&gt;');
        argument = argument.replace(/"/g, '&quot;');
        argument = argument.replace(/'/g, '&apos;');
        return argument;
      } else {
        return '';
      }
    } catch (e) {
      log.debug({
        title: e.name,
        details: e.message,
      });
    }
  }

  function isEmpty(str) {
    return !str || 0 === str.length;
  }

  function formatCurrency(val) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  function isEmptyObj(obj) {
    return Object.keys(obj).length === 0;
  }

  function numberToEnglish(n, custom_join_character) {
    var string = n.toString(),
      units,
      tens,
      scales,
      start,
      end,
      chunks,
      chunksLen,
      chunk,
      ints,
      i,
      word,
      words;

    var and = custom_join_character || 'and';

    /* Is number zero? */
    if (parseInt(string) === 0) {
      return 'zero';
    }

    /* Array of units as words */
    units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    /* Array of tens as words */
    tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    /* Array of scales as words */
    scales = [
      '',
      'thousand',
      'million',
      'billion',
      'trillion',
      'quadrillion',
      'quintillion',
      'sextillion',
      'septillion',
      'octillion',
      'nonillion',
      'decillion',
      'undecillion',
      'duodecillion',
      'tredecillion',
      'quatttuor-decillion',
      'quindecillion',
      'sexdecillion',
      'septen-decillion',
      'octodecillion',
      'novemdecillion',
      'vigintillion',
      'centillion',
    ];

    /* Split user arguemnt into 3 digit chunks from right to left */
    start = string.length;
    chunks = [];
    while (start > 0) {
      end = start;
      chunks.push(string.slice((start = Math.max(0, start - 3)), end));
    }

    /* Check if function has enough scale words to be able to stringify the user argument */
    chunksLen = chunks.length;
    if (chunksLen > scales.length) {
      return '';
    }

    /* Stringify each integer in each chunk */
    words = [];
    for (i = 0; i < chunksLen; i++) {
      chunk = parseInt(chunks[i]);

      if (chunk) {
        /* Split chunk into array of individual integers */
        ints = chunks[i].split('').reverse().map(parseFloat);

        /* If tens integer is 1, i.e. 10, then add 10 to units integer */
        if (ints[1] === 1) {
          ints[0] += 10;
        }

        /* Add scale word if chunk is not zero and array item exists */
        if ((word = scales[i])) {
          words.push(word);
        }

        /* Add unit word if array item exists */
        if ((word = units[ints[0]])) {
          words.push(word);
        }

        /* Add tens word if array item exists */
        if ((word = tens[ints[1]])) {
          words.push(word);
        }

        /* Add 'and' string after units or tens integer if: */
        if (ints[0] || ints[1]) {
          /* Chunk has a hundreds integer or chunk is the first of multiple chunks */
          if (ints[2] || (!i && chunksLen)) {
            words.push(and);
          }
        }

        /* Add hundreds word if array item exists */
        if ((word = units[ints[2]])) {
          words.push(word + ' hundred');
        }
      }
    }

    return words.reverse().join(' ');
  }

  /**
   * @name BAHTTEXT.js
   * @version 1.1.5
   * @update May 1, 2017
   * @website: https://github.com/earthchie/BAHTTEXT.js
   * @author Earthchie http://www.earthchie.com/
   * @license WTFPL v.2 - http://www.wtfpl.net/
   **/
  function BAHTTEXT(num, suffix) {
    'use strict';

    if (typeof suffix === 'undefined') {
      suffix = 'บาทถ้วน';
    }

    num = num || 0;
    num = num.toString().replace(/[, ]/g, ''); // remove commas, spaces

    if (isNaN(num) || Math.round(parseFloat(num) * 100) / 100 === 0) {
      return 'ศูนย์บาทถ้วน';
    } else {
      var t = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'],
        n = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'],
        len,
        digit,
        text = '',
        parts,
        i;

      if (num.indexOf('.') > -1) {
        // have decimal

        /*
         * precision-hack
         * more accurate than parseFloat the whole number
         */

        parts = num.toString().split('.');

        num = parts[0];
        parts[1] = parseFloat('0.' + parts[1]);
        parts[1] = (Math.round(parts[1] * 100) / 100).toString(); // more accurate than toFixed(2)
        parts = parts[1].split('.');

        if (parts.length > 1 && parts[1].length === 1) {
          parts[1] = parts[1].toString() + '0';
        }

        num = parseInt(num, 10) + parseInt(parts[0], 10);

        /*
         * end - precision-hack
         */
        text = num ? BAHTTEXT(num) : '';

        if (parseInt(parts[1], 10) > 0) {
          text = text.replace('ถ้วน', '') + BAHTTEXT(parts[1], 'สตางค์');
        }

        return text;
      } else {
        if (num.length > 7) {
          // more than (or equal to) 10 millions

          var overflow = num.substring(0, num.length - 6);
          var remains = num.slice(-6);
          return BAHTTEXT(overflow).replace('บาทถ้วน', 'ล้าน') + BAHTTEXT(remains).replace('ศูนย์', '');
        } else {
          len = num.length;
          for (i = 0; i < len; i = i + 1) {
            digit = parseInt(num.charAt(i), 10);
            if (digit > 0) {
              if (len > 2 && i === len - 1 && digit === 1 && suffix !== 'สตางค์') {
                text += 'เอ็ด' + t[len - 1 - i];
              } else {
                text += n[digit] + t[len - 1 - i];
              }
            }
          }

          // grammar correction
          text = text.replace('หนึ่งสิบ', 'สิบ');
          text = text.replace('สองสิบ', 'ยี่สิบ');
          text = text.replace('สิบหนึ่ง', 'สิบเอ็ด');

          return text + suffix;
        }
      }
    }
  }

  return {
    onRequest: onRequest,
  };
});
