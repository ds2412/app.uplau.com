export default function LoginPage() { //export default function 
    return(
        <>
        {/*sekcja header*/}
        <div className="header">
            <img src="https://picsum.photos/200/100" alt="Logo" />
        </div>

        {/*sekcja logowania*/}
        <div className="login-section">
            <h1>Zaloguj się</h1>

            <form>
                <label htmlFor="email">Email:</label>
                <input type="email" id="email" name="email" required />
                <br />
                <label htmlFor="password">Hasło:</label>
                <input type="password" id="password" name="password" required />
                <br />
                <button type="submit">ZALOGUJ SIĘ</button>
                <br />
                <p>Nie masz konta? <a href="/register">Zarejestruj się</a></p>
            </form>
        </div>

         {/*sekcja stopki*/}
        <div className="footer">
            <h2>Potrzebujesz pomocy?</h2>
        </div>
</>
    );
}