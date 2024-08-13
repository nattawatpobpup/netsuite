define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printCN(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_creditnote',
            deploymentId: 'customdeploy_creditnote'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }
    

    return{
        printCN:printCN
    }
})