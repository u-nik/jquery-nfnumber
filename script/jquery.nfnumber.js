/**
 * jQuery Plugin zur Formatierung von Zahlenwerten innerhalb normaler Textfelder. Bei HTML5 Input Feldern vom Typ
 * "number" funktioniert die Formatierung nicht, jedoch das Verändern des Wertes über die Pfeil- und +/- Tasten.
 *
 * @author Niklas Funke <niklas.funke@gmail.com>
 * @date: 09.03.12
 * @version 0.1
 *
 * Copyright (c) 2012, Niklas Funke
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function ($) {

    // Einstellungen
    var defaultSettings = {
        /** @var int Genauigkeit (Anzahl Kommastellen) */
        precision:2,
        /** @var numeric Schritt bei Inkrementierung oder Dekrementierung */
        step:0,
        /** @var numeric Allgemeiner Maximalwert */
        max:null,
        /** @var numeric Allgemeiner Minimalwert */
        min:null,
        /** @var string Dezimaltrennzeichen */
        decsign:'.',
        /** @var string Tausendertrennzeichen */
        seperator:'',
        /** @var numeric Multiplikator der Schritte bei gedrückter Shift Taste */
        shiftmulti:100,
        /** @var string Selector für Eingabefeld */
        selector:'input.nfnumbers',
        /** @var bool Formatiert alle Eingabefelder bei Initialisierung */
        initformat:true,
        /** @var string Prefix */
        prefix:'',
        /** @var string Suffix */
        suffix:'',
        /**
         * Definiert das Ein- und Ausgabeformat der Feldwerte in einem Formular.
         *  "raw":          Werte werden als systemmatische Zahlen interpretiert und ausgegeben.
         *                  Eingabe -> Anzeige -> Ausgabe
         *                  1000.00 -> 1.000,00 -> 1000.00
         *  "formatted":    Werte werden als formatierte Zahlen interpretiert und ausgegeben.
         *                  Eingabe -> Anzeige -> Ausgabe
         *                  1.000,00 -> 1.000,00 -> 1.000,00
         * @var string
         */
        formmode:'raw' // {string}
    };

    // Mögliche Methoden.
    var methods = {
        /**
         * Initialisiert die Nummernformatierung.
         * @param options NFNumber Benutzereinstellungen
         * @return jQuery selected Element
         */
        init:function (options) {
            var $this = $(this);

            // Benutzereinstellungen übernehmen.
            var settings = $.extend({}, defaultSettings, options);
            helper.setStep(settings);

            // Vorhandene
            methods.destroy(options);

            // Handler neu an Events binden.
            $this.on('change.nfnumber', settings.selector, settings, handler.change);
            $this.on('blur.nfnumber', settings.selector, settings, handler.change);
            $this.on('keydown.nfnumber', settings.selector, settings, handler.keydown);

            // Hiddenfields erzeugen für reele werten.
            if (settings.formmode == 'raw') {
                $this.find(settings.selector).each(function (i, e) {
                    var $e = $(e);
                    var uuid = helper.uuid();

                    $e.after($e.clone(false).attr('type', 'hidden').addClass('nfnumber-hidden nfnumber-uuid-' + uuid));
                    $e.data({'nfnumber-uuid': uuid}).attr('name', null);
                });
            }

            // Eingabefelder formatieren.
            if (settings.initformat) {
                $this.find(settings.selector).trigger('change.nfnumber', true);
            }

            return this;
        },
        /**
         * Entfernt alle Eventhandler von den Elemente. Aufruf über "$(selector).nfnumber('destroy');".
         * @return jQuery selected Element
         */
        destroy:function(options) {
            var $this = $(this);

            // Benutzereinstellungen übernehmen.
            var settings = $.extend({}, defaultSettings, options);

            // Hiddenfields erzeugen für reele werten.
            $this.find(settings.selector).each(function (i, e) {
                var $e = $(e);
                var $h = $('.nfnumber-uuid-' + $e.data('nfnumber-uuid'));
                if ($h) {
                    $e.attr('name', $h.attr('name')).val($h.val());
                    $h.remove();
                }
            });

            // Vorhandene Eventhandler entfernen.
            $this.off('change.nfnumber', settings.selector, handler.change);
            $this.off('blur.nfnumber', settings.selector, handler.change);
            $this.off('keydown.nfnumber', settings.selector, handler.keydown);

            return this;
        },
        /**
         * Formatiert eine Zahl in einen String anhand des gegebenen Formates.
         * @param flt Float, Double oder Integerzahl
         * @param settings NFNumber Einstellungen
         * @return string
         */
        toString:function (flt, settings) {
            var retval = "",
                p = settings.precision;

            // Runden
            flt = helper.round(flt, p);
            var str = "" + flt;

            // Komma ermittlen
            var idx = str.indexOf(".");

            // fehlende Nullen einfügen
            str += (idx == -1 ? "." : "" ) + Math.pow(10, p).toString().substring(1);

            // Ist die Zahl negativ und darf sie auch so dargestellt werden?
            var neg = flt < 0;

            if (neg) {
                // Führendes "-" wegschneiden. Stört erstmal nur.
                str = str.substring(1);
            }

            idx = str.indexOf(".");

            // Nachkommastellen ermittlen
            if (idx == -1) {
                idx = str.length;
            } else {
                retval = settings.decsign + str.substr(idx + 1, p);
            }

            while (idx > 0) {
                if (idx - 3 > 0) {
                    retval = settings.seperator + str.substring(idx - 3, idx) + retval;
                } else {
                    retval = str.substring(0, idx) + retval;
                }

                idx -= 3;
            }

            return settings.prefix + (neg ? "-" : "") + retval + settings.suffix;
        },
        /**
         * Parsed einen String in eine Zahl anhand des gegebenen Formates.
         * @param str Stringdarstellung einer Zahl
         * @param settings NFNumber Einstellungen
         * @return float
         */
        toFloat:function (str, settings) {

            if (typeof str == 'string') {
                if (settings.prefix != '') {
                    str = helper.replace(settings.prefix, '', str);
                }

                if (settings.suffix != '') {
                    str = helper.replace(settings.suffix, '', str);
                }

                if (settings.seperator != '' && str.indexOf(settings.seperator) != -1) {
                    str = helper.replace(settings.seperator, "", str);
                }

                if (settings.decsign != '.' && str.indexOf(settings.decsign) != -1) {
                    str = helper.replace(settings.decsign, ".", str);
                }
            } else {
                str = "0";
            }

            var flt = parseFloat(str);

            // Float gefunden? Wenn ja, Float liefern, sonst 0
            if (flt == Number.NaN) {
                $.error('Invalid Number: ' + str);
                return 0;
            }

            return flt;
        }
    };

    // Hilfsmethoden.
    var helper = {
        /**
         * Erzeugt automatisch den kleinsten Schritt anhand der übergebenen Genauigkeit wenn kein Schritt definiert
         * wurde.
         * @param s NFNumber Einstellungen.
         */
        setStep:function (s) {
            if (s.step == 0 && s.precision > 0) {
                s.step = 1 / Math.pow(10, s.precision);
            }
        },
        /**
         * Rundet den angegebenen Wert auf die angegebene Genauigkeit.
         * @param value
         * @param precision
         */
        round:function (value, precision) {
            // Runden
            var f = Math.pow(10, precision);
            value = Math.round(value * f) / f;

            return value;
        },
        /**
         * Einfache String Replace Implementation ohne RegExp.
         * @param search Zu ersetzender String
         * @param replace Ersatzstring
         * @param subj String in dem gesucht und ersetzt wird
         * @return string Fertig ersetzter String
         */
        replace:function(search, replace, subj) {
            return subj.split(search).join(replace);
        },
        /**
         * Erzeugt eine einigermaßen einmalige ID.
         * @return string
         */
        uuid:function() {
            return(((1+Math.random())*0x10000)|0).toString(16).substring(1);
        },
        /**
         * Normalisiert den Wert anhand der übergebenen Einstellungen.
         * @param v float Wert
         * @param s object NFNumber Einstellungen
         */
        normalize:function(v, s) {
            // Auf Schrittgröße runden und Javascript Rundungsfehler kompensieren
            v = Math.ceil(helper.round(v / s.step, s.precision)) * s.step;
            v = helper.round(v, s.precision);

            // Zahl auf Minimum erhöhen oder Maximum absenken wenn erforderlich.
            v = s.max != null ? Math.min(v, s.max) : v;
            v = s.min != null ? Math.max(v, s.min) : v;

            return v;
        }
    };

    // Eventhandler.
    var handler = {
        /**
         * onChange Handler. Er Formatiert den Text nach der Eingabe neu.
         * @param e jQuery Event Object
         */
        change:function (e, init) {
            var $input = $(this);

            // Standarddaten überschreiben
            var d = $.extend({}, e.data, $input.data());
            helper.setStep(d);


            if (init != undefined && init && d.formmode == 'raw') {
                // Wert einfach übernehmen da korrekter Zahlenwert.
                var v = Math.max(parseFloat($input.val()), d.min);

            } else {
                // Wert des Eingabefeldes aus String parsen.
                var v = methods.toFloat($input.val(), d);
            }

            // Wert normalisieren.
            v = helper.normalize(v, d);

            if (d.formmode == 'raw') {
                $('.nfnumber-uuid-' + $input.data('nfnumber-uuid')).val(v);
            }

            $input.val(methods.toString(v, d));
            return false;
        },
        /**
         * onKeydown Handler. Er verändert den Wert des Feldes anhand von Tastenkombinationen.
         * @param e jQuery Event Object
         */
        keydown:function (e) {
            var $input = $(this);

            // Standarddaten überschreiben
            var d = $.extend({}, e.data, $input.data());
            helper.setStep(d);

            // Wert des Eingabefeldes parsen.
            var v = methods.toFloat($input.val(), d);
            var vprev = v;
            var retval = false;

            switch (e.which) {
                case 38: // Up
                case 107: // +
                    // Wert inkrementieren.
                    if (e.shiftKey) {
                        v = v + (d.shiftmulti * d.step);
                    } else {
                        v = v + d.step;
                    }
                    // Javascript Rundungsfehler kompensieren
                    v = helper.round(v, d.precision);
                    break;

                case 40: // Down
                case 109: // -
                    // Wert dekrementieren
                    if (e.shiftKey) {
                        v = v - (d.shiftmulti * d.step);
                    } else {
                        v = v - d.step;
                    }
                    // Javascript Rundungsfehler kompensieren
                    v = helper.round(v, d.precision);
                    break;

                case 32: // Leerzeichen
                    // Zurücksetzen auf 0
                    if (e.shiftKey) {
                        v = d.min != null ? d.min : 0;
                    } else {
                        v = d.max != null ? d.max : 0;
                    }
                    break;

                case 8: // Rückschritt
                case 9: // Tab
                case 13: // Enter
                case 35: // Pos1
                case 36: // End
                case 37: // Rechts
                case 39: // Links
                case 46: // Entf
                    return true;

                // Erlaubte Taste mit Shift und verbotener Rest.
                default:
                    if (!e.shiftKey) {
                        if (e.which >= 48 && e.which <= 57) {
                            // Zahlen im Hauptfeld
                            return true;
                        } else if (e.which >= 96 && e.which <= 105) {
                            // Zahlen auf Numpad.
                            return true;
                        } else if (e.which == 110 || e.which == 188 || e.which == 190) {
                            // Komma, Komma, Punkt
                            return true;
                        }
                    }
                    console.log(e.which);
                    return false;
            }

            // Wert darf Max nicht über- oder 0 unterschreiten.
            if (v != vprev) {
                // Wert normalisieren.
                v = helper.normalize(v, d);

                if (d.formmode == 'raw') {
                    $('.nfnumber-uuid-' + $input.data('nfnumber-uuid')).val(v);
                }

                $input.val(methods.toString(v, d));
            }

            return retval;
        }
    };

    // Hauptmethode
    $.fn.nfnumber = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));

        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);

        } else {
            $.error('Method ' + method + ' does not exist on jQuery.nfnumber');
        }

        return this;
    }

})(jQuery);