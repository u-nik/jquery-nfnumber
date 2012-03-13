
$(function() {
    // Wertbuttons
    $('fieldset button').on('click', function(){
        alert($('#' + $(this).data('id')).nfnumber('value'));
    });

    // Handler zum Ausgegen der Formulardaten, so wie sie am Server ankämen.
    $('form').on('submit', function(e) {
        e.preventDefault();
        var obj = {}, string = "";
        $('input[name]').each(function(index, e){
            var $e = $(e);
            var name = $e.attr('name');
            obj[name] = name + ':"' + $e.val() + '"';
        });

        for(var i in obj) {
            if (obj.hasOwnProperty(i)) {
                string += obj[i] + "\n";
            }
        }
        alert(string);

        console.log($('#test').nfnumber('value'));
    })
});